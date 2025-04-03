import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Enhanced noun extraction that captures all potential nouns
const extractNouns = (text) => {
  // Common words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 'under', 'over', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'there', 'here'
  ]);

  // Remove special characters
  const specialChars = /[.,/#!$%^&*;:{}=_`~()]/g;
  const cleanedText = text.toLowerCase().replace(specialChars, '');
  
  // Split into words and filter
  const words = cleanedText.split(/\s+/).filter(word => 
    word.length > 2 && !stopWords.has(word)
  );

  return words;
};

const App = () => {
  const [images, setImages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Welcome! Describe a scene and I\'ll find all matching images.' }
  ]);
  const [browserSupport, setBrowserSupport] = useState(true);
  
  const imageTrackRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);

  const checkImageExists = useCallback((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }, []);

  const tryImageExtensions = useCallback(async (baseName) => {
    const extensions = ['.jpg', '.png', '.jpeg', '.webp'];
    const imageUrlBase = 'http://localhost:5000/images/';
    
    // Try all extensions in parallel
    const imageChecks = await Promise.all(
      extensions.map(async (ext) => {
        const imageUrl = `${imageUrlBase}${baseName}${ext}`;
        const exists = await checkImageExists(imageUrl);
        return exists ? { 
          url: imageUrl, 
          name: `${baseName}${ext}`,
          displayName: baseName 
        } : null;
      })
    );

    // Return the first existing image found
    return imageChecks.find(image => image !== null) || null;
  }, [checkImageExists]);

  const handleRecognitionError = useCallback((error) => {
    let errorMessage = 'Error occurred in speech recognition';
    if (error === 'not-allowed' || error.name === 'NotAllowedError') {
      errorMessage = 'Microphone access was denied. Please allow microphone access.';
    } else if (error === 'no-speech') {
      errorMessage = 'No speech detected. Try again.';
    } else if (error === 'audio-capture') {
      errorMessage = 'No microphone found. Ensure a microphone is connected.';
    } else if (error.message?.includes('not supported')) {
      errorMessage = 'Speech recognition not supported in your browser.';
    }
    
    setError(errorMessage);
    setChatMessages(prev => [...prev, { sender: 'ai', text: errorMessage }]);
  }, []);

  const processScene = useCallback(async (text = inputValue) => {
    const valueToUse = text || inputValue;
    if (!valueToUse.trim()) {
      setError("Please describe a scene");
      return;
    }

    setIsLoading(true);
    setChatMessages(prev => [...prev, { 
      sender: 'user', 
      text: `Processing scene: "${valueToUse}"` 
    }]);

    try {
      // Extract all potential nouns
      const nouns = extractNouns(valueToUse);
      
      if (nouns.length === 0) {
        setError("No identifiable objects found in the description");
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: "I couldn't find any objects in that description." 
        }]);
        return;
      }

      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Looking for: ${nouns.join(', ')}` 
      }]);

      // Process all nouns in parallel
      const imageResults = await Promise.all(
        nouns.map(noun => tryImageExtensions(noun))
      );

      // Filter out null results and flatten the array
      const foundImages = imageResults.filter(img => img !== null);

      if (foundImages.length > 0) {
        setImages(prev => [...prev, ...foundImages]);
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: `Found ${foundImages.length} images matching your scene` 
        }]);
        setInputValue("");
        setError("");
      } else {
        const errorMsg = `No images found for any objects in "${valueToUse}"`;
        setError(errorMsg);
        setChatMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
      }
    } catch (err) {
      setError("Failed to process the scene description");
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "Sorry, there was an error processing your request." 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, tryImageExtensions]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      recognitionRef.current.start();
      setIsListening(true);
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "Listening... Describe a scene" 
      }]);
      setError("");
    } catch (error) {
      handleRecognitionError(error);
    }
  }, [isListening, handleRecognitionError]);

  // Initialize speech recognition
  useEffect(() => {
    const initSpeechRecognition = async () => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('Speech recognition not supported');
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript.trim();
          setInputValue(transcript);
          setChatMessages(prev => [...prev, { 
            sender: 'user', 
            text: `Described scene: ${transcript}` 
          }]);
          setTimeout(() => {
            processScene(transcript);
          }, 500);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          handleRecognitionError(event.error);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } catch (error) {
        console.error('Speech recognition initialization error:', error);
        setBrowserSupport(false);
        handleRecognitionError(error);
      }
    };

    initSpeechRecognition();
  }, [processScene, handleRecognitionError]);

  // Auto-scroll chat and adjust image track
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }

    if (imageTrackRef.current && images.length > 0) {
      const itemWidth = 150;
      const itemMargin = 10;
      const trackWidth = images.length * (itemWidth + itemMargin * 2);
      const containerWidth = imageTrackRef.current.parentElement.clientWidth;
      
      const shiftAmount = (trackWidth - containerWidth) / 2;
      imageTrackRef.current.style.transform = shiftAmount > 0 
        ? `translateX(calc(50% - ${shiftAmount}px))` 
        : 'translateX(-50%)';
    }
  }, [chatMessages, images]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      processScene();
    }
  };

  const clearAll = () => {
    setImages([]);
    setChatMessages([{ sender: 'ai', text: 'Canvas cleared. Ready for new scenes.' }]);
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="chat-container" ref={chatContainerRef}>
          {chatMessages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-bubble ${message.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}
            >
              {message.text}
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble ai-bubble">
              Processing your scene description...
            </div>
          )}
        </div>
        
        <button className="clear-button" onClick={clearAll}>
          Clear All
        </button>
      </div>

      <div className="main-content">
        <div className="canvas-container">
          {images.length > 0 ? (
            <div className="image-track" ref={imageTrackRef}>
              {images.map((image, index) => (
                <div key={index} className="image-item">
                  <img src={image.url} alt={image.displayName} />
                  <div className="image-caption">{image.displayName}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {browserSupport ? 'Describe a scene to see matching images' : 'Type a scene description'}
            </div>
          )}
        </div>

        <div className="prompt-container">
          <input
            type="text"
            className="prompt-input"
            placeholder={browserSupport ? "Describe a scene (e.g., 'A sunny beach with palm trees')..." : "Type a scene description..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          
          <div className="button-group">
            {browserSupport && (
              <button
                className={`mic-button ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={isLoading}
              >
                {isListening ? '🛑 Stop' : '🎤 Speak'}
              </button>
            )}
            <button
              className="submit-button"
              onClick={() => processScene()}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Processing...' : 'Find Images'}
            </button>
          </div>
          
          <div className="mic-status">
            {isListening ? 'Listening...' : error || (browserSupport ? 'Ready' : 'Type your description')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
