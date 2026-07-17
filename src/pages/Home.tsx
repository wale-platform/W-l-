import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { ProblemStory } from '../components/home/ProblemStory';
import { WhyWaleExists } from '../components/home/WhyWaleExists';
import { CampusFinder } from '../components/home/CampusFinder';
import { FeaturedNeighborhoods } from '../components/home/FeaturedNeighborhoods';
import { FeaturedProperties } from '../components/home/FeaturedProperties';
import { HowWaleWorks } from '../components/home/HowWaleWorks';
import { TrustFeatures } from '../components/home/TrustFeatures';
import { Testimonials } from '../components/home/Testimonials';
import { Roadmap } from '../components/home/Roadmap';
import { FAQ } from '../components/home/FAQ';
import { FinalCTA } from '../components/home/FinalCTA';

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <ProblemStory />
      <WhyWaleExists />
      <CampusFinder />
      <FeaturedNeighborhoods />
      <FeaturedProperties />
      <HowWaleWorks />
      <TrustFeatures />
      <Roadmap />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </div>
  );
}
