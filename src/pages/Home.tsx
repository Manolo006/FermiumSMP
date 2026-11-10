import React from 'react';
import { Hero } from '../components/sections/Hero';
import { About } from '../components/sections/About';
import { Statistics } from '../components/sections/Statistics';
import { MembersPreview } from '../components/sections/MembersPreview';
import { MediaSection } from '../components/sections/MediaSection';
import { ProjectsPreview } from '../components/sections/ProjectsPreview';
import { GalleryPreview } from '../components/sections/GalleryPreview';
import { CommunityCTA } from '../components/sections/CommunityCTA';

export const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <About />
      <Statistics />
      <MembersPreview />
      <MediaSection />
      <ProjectsPreview />
      <GalleryPreview />
      <CommunityCTA />
    </>
  );
};
