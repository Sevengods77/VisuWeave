import React, { useState } from 'react';
import Canvas from '../components/Canvas';

const Home = () => {
  const [query, setQuery] = useState('');

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to the Canvas App</h1>
      <input
        type="text"
        placeholder="Search for images..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: '10px', width: '300px' }}
      />
      <Canvas query={query} />
    </div>
  );
};

export default Home;
