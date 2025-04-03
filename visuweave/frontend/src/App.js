import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Symbol to filename mapping
const symbolToFilename = {
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'dividedby',
  '=': 'equals',
  '!': 'exclamation',
  '?': 'question',
  '@': 'at',
  '#': 'hash',
  '$': 'dollar',
  '%': 'percent',
  '^': 'caret',
  '&': 'and',
  '(': 'leftparenthesis',
  ')': 'rightparenthesis'
};

// Only handle irregular plurals
const toSingular = (word) => {
  const irregulars = {
    children: 'child',
    people: 'person',
    men: 'man',
    women: 'woman',
    feet: 'foot',
    teeth: 'tooth',
    mice: 'mouse',
    geese: 'goose',
    oxen: 'ox',
    lice: 'louse',
    criteria: 'criterion',
    phenomena: 'phenomenon'
  };
  return irregulars[word] || word;
};

// Enhanced object extraction that preserves order and duplicates
const extractObjects = (text) => {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 'under', 'over', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'there', 'here',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'can', 'could', 'shall', 'should', 'may', 'might', 'must'
  ]);

  // Clean text and preserve numbers and symbols
  // Fixed all unnecessary escape characters in regex
  const cleanedText = text.toLowerCase().replace(/[^a-z0-9\s+*=!?@#$%^&()/-]/g, '');
  const words = cleanedText.split(/\s+/).filter(word => 
    word.length > 0 && !stopWords.has(word)
  );

  // Preserve order and duplicates
  return words.map(word => {
    // Check if it's a number first
    if (/^\d+$/.test(word)) return word;
    // Check if it's a symbol that has a corresponding image
    if (symbolToFilename[word]) return word;
    // Finally apply irregular plural conversion
    return toSingular(word);
  });
};

// ... [Rest of the component code remains exactly the same as previous version]
// Including all the state, effects, handlers, and JSX


const App = () => {
  const [images, setImages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Welcome! Describe anything to see matching images.' }
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

  const tryImageExtensions = useCallback(async (object) => {
    const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const imageUrlBase = 'http://localhost:5000/images/';
    
    // First try the exact object name
    for (const ext of extensions) {
      const exists = await checkImageExists(`${imageUrlBase}${object}${ext}`);
      if (exists) {
        return {
          url: `${imageUrlBase}${object}${ext}`,
          name: `${object}${ext}`,
          displayName: object
        };
      }
    }
    
    // If no exact match, try symbol filenames
    if (symbolToFilename[object]) {
      const symbolFile = symbolToFilename[object];
      for (const ext of extensions) {
        const exists = await checkImageExists(`${imageUrlBase}${symbolFile}${ext}`);
        if (exists) {
          return {
            url: `${imageUrlBase}${symbolFile}${ext}`,
            name: `${symbolFile}${ext}`,
            displayName: object // Show the original symbol
          };
        }
      }
    }
    
    return null;
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

  const toggleListening = useCallback(async () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.start();
      setIsListening(true);
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "Listening... Speak now" 
      }]);
      setError("");
    } catch (error) {
      handleRecognitionError(error);
    }
  }, [isListening, handleRecognitionError]);

  const processInput = useCallback(async (text = inputValue) => {
    const valueToUse = text.trim();
    if (!valueToUse) {
      setError("Please enter some text");
      return;
    }

    setIsLoading(true);
    setChatMessages(prev => [...prev, { 
      sender: 'user', 
      text: `Processing: "${valueToUse}"` 
    }]);

    try {
      const objects = extractObjects(valueToUse);
      
      if (objects.length === 0) {
        setError("No identifiable objects found");
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: "I couldn't find any objects in that description." 
        }]);
        return;
      }

      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Looking for: ${objects.join(', ')}` 
      }]);

      // Process objects in order and preserve duplicates
      const foundImages = [];
      for (const obj of objects) {
        const image = await tryImageExtensions(obj);
        if (image) {
          foundImages.push(image);
        }
      }

      if (foundImages.length > 0) {
        setImages(foundImages);
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: `Found ${foundImages.length} matching images in order` 
        }]);
        setInputValue("");
        setError("");
      } else {
        const errorMsg = `No images found for "${valueToUse}"`;
        setError(errorMsg);
        setChatMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
      }
    } catch (err) {
      setError("Failed to process input");
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "Sorry, there was an error processing your request." 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, tryImageExtensions]);

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
            text: `You said: ${transcript}` 
          }]);
          setIsListening(false);
          setTimeout(() => processInput(transcript), 500);
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
        setBrowserSupport(false);
        handleRecognitionError(error);
      }
    };

    initSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [processInput, handleRecognitionError]);

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
      processInput();
    }
  };

  const clearAll = () => {
    setImages([]);
    setChatMessages([{ sender: 'ai', text: 'Canvas cleared. Ready for new input.' }]);
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
              Processing your input...
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
              {browserSupport ? 'Speak or type to see images' : 'Type to see images'}
            </div>
          )}
        </div>

        <div className="prompt-container">
          <input
            type="text"
            className="prompt-input"
            placeholder={browserSupport ? 
              "Describe anything (e.g., '1 + 1')..." : 
              "Type a description..."}
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
                {isListening ? '🛑 Listening...' : '🎤 Speak'}
              </button>
            )}
            <button
              className="submit-button"
              onClick={() => processInput()}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Processing...' : 'Find Images'}
            </button>
          </div>
          
          <div className="mic-status">
            {isListening ? 'Speak now...' : error || 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
