'use client';

import dynamic from 'next/dynamic';

const MapWithNoSSR = dynamic(() => import('./map.tsx'), {
  ssr: false,
});

const Home = () => {
  return (
    <div>
      <h1 className='text-5xl font-extrabold text-center'>Map</h1>
      <MapWithNoSSR />
    </div>
  );
};

export default Home;
