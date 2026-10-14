import React from 'react';
import FeatureArt from '@/components/art/FeatureArt';

export default function FeatureCard({ id, title, text, index = 0 }) {
  return (
    <article
      className="dd-rise flex flex-col items-center gap-3 rounded-2xl border-[4px] border-[#151515] bg-[#FFF6E2]/95 p-4 text-center shadow-[0_7px_0_#151515]"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="h-24 w-full max-w-[200px]">
        <FeatureArt id={id} />
      </div>
      <h2 className="font-display text-lg leading-tight text-[#151515]">{title}</h2>
      <p className="font-body text-xs font-semibold leading-snug text-[#151515]/75">{text}</p>
    </article>
  );
}
