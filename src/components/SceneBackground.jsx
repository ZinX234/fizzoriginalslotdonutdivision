const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from 'react';

const streetBackground = new URL('../assets/donut-division-background.png', import.meta.url).href;

// Keep the play scene bundled so it remains available in every deployment.
export const STREET_BG = streetBackground;
export const DESK_BG = 'https://media.db.com/images/public/6ac52dd61fb7f0e1d83cc330/f736e4ed5_generated_image.png';

// City street backdrop for the main game screen.
export default function SceneBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={STREET_BG} alt="" className="absolute inset-0 block h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,11,8,0.12)_0%,rgba(14,11,8,0.02)_34%,rgba(14,11,8,0.28)_100%)]" />
    </div>
  );
}