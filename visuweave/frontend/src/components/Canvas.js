import React, { useState, useEffect } from 'react';

const Canvas = ({ query }) => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/images?query=${query}`);
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        setImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    if (query) {
      fetchImages();
    }
  }, [query]);

  return (
    <div>
      <h2>Image Canvas</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {images.map((image, index) => (
          <img
            key={index}
            src={`/public/images/${image}`} // Fetch from local directory
            alt={image}
            style={{ width: '150px', height: '150px', margin: '10px' }}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
