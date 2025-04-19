"use client";

import { motion, LayoutGroup } from "framer-motion";
import { Search, MapPin, Building, TrendingUp, ArrowRight, Calculator, BarChart4, MapPinned, Brain, Presentation, LineChart, Sigma, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { getAddressFromPostal } from '@/app/services/oneMap';
import { getRecentTransactions } from '@/app/services/hdbData';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import TextRotate from "@/components/TextRotate";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";

export default function Home() {
  const [postalCode, setPostalCode] = useState("");
  const [flatType, setFlatType] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearch = async () => {
    if (!postalCode || postalCode.length !== 6) {
      toast.error("Please enter a valid 6-digit postal code");
      return;
    }

    if (!flatType) {
      toast.error("Please select a flat type");
      return;
    }

    setLoading(true);
    try {
      const address = await getAddressFromPostal(postalCode);
      if (!address) {
        toast.error("Invalid postal code");
        setLoading(false);
        return;
      }
      
      // Navigate to valuation page
      const encodedFlatType = encodeURIComponent(flatType);
      router.push(`/valuation?postal=${postalCode}&flatType=${encodedFlatType}`);
      // Note: We don't set loading to false here as we're navigating away
    } catch (error) {
      toast.error("Error fetching address");
      setLoading(false);
    }
  };

  // Custom BentoItems based on the README features
  const hdbFeatures: BentoItem[] = [
    {
      title: "Advanced Valuation Models", 
      meta: "95% accuracy",
      description: "Get accurate property valuations using ARIMAX statistical models and Xgboost algorithms",
      icon: <Calculator className="w-6 h-6 text-primary" />,
      status: "Core Feature",
      tags: ["Valuation", "ML", "Analysis"],
      colSpan: 2,
      hasPersistentHover: true,
    },
    {
      title: "Comprehensive Analytics",
      meta: "Data-driven",
      description: "Visualize historical pricing trends and economic performance correlation",
      icon: <BarChart4 className="w-6 h-6 text-emerald-500" />,
      status: "Live",
      tags: ["Charts", "Trends", "Forecasting"],
    },
    {
      title: "Neighborhood Insights",
      meta: "Geo mapping",
      description: "Discover nearby amenities with distance metrics and market comparison with similar properties",
      icon: <MapPinned className="w-6 h-6 text-violet-500" />,
      tags: ["Maps", "Amenities", "Location"],
    },
    {
      title: "AI-Powered Analysis",
      meta: "Smart insights",
      description: "Generate detailed property reports with market sentiment and economic analysis",
      icon: <Brain className="w-6 h-6 text-sky-500" />,
      status: "Premium",
      tags: ["AI", "Reports", "Trends"],
      colSpan: 2,
    },
    {
      title: "Beautiful UI Experience",
      meta: "Responsive design",
      description: "Modern, intuitive interface with interactive maps and comprehensive filtering options",
      icon: <Presentation className="w-6 h-6 text-amber-500" />,
      status: "Next.js + React",
      tags: ["UI/UX", "Maps", "Mobile Friendly"],
    },
    {
      title: "AI Chatbot Assistant",
      meta: "24/7 Support",
      description: "Chat with our AI assistant to understand your property report and get answers to any questions about your property",
      icon: <Sigma className="w-6 h-6 text-rose-500" />,
      status: "Advanced",
      tags: ["AI", "Support", "Q&A"],
      colSpan: 2,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 dark:from-background dark:to-secondary/5">
      {/* Announcement Banner */}
      <div className="pt-6">
        <AnnouncementBanner 
          text="✨ Watch ChatHDB Introduction Video" 
          link="https://www.youtube.com/watch?v=g7sjnaTnMUI"
        />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-8 pb-24 min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto flex-grow flex flex-col justify-center"
        >
          <div className="flex justify-center mb-0 relative">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={250} 
              height={250} 
              className="h-auto block dark:hidden"
              priority
            />
            <Image 
              src="/logo_dark.png" 
              alt="Logo" 
              width={250} 
              height={250} 
              className="h-auto hidden dark:block"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 -mt-4">
            Find Your HDB&apos;s
            <LayoutGroup>
              <motion.span layout className="flex whitespace-pre justify-center block">
                <TextRotate 
                  texts={[
                    "Market Value",
                    "Fair Price",
                    "True Worth",
                    "Real Value",
                    "Current Price",
                    "Actual Worth",
                    "Market Price",
                  ]}
                  mainClassName="text-primary font-bold block py-1 md:py-2 text-shadow-sm"
                  staggerDuration={0.03}
                  staggerFrom="last"
                  rotationInterval={3000}
                />
              </motion.span>
            </LayoutGroup>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Singapore's most advanced HDB valuation & analytics platform
          </p>

          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Enter your postal code"
                className="pl-10 h-12 rounded-lg"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Select value={flatType} onValueChange={setFlatType}>
              <SelectTrigger className="w-full md:w-[180px] h-12 bg-white/60 backdrop-blur-sm 
                border-zinc-200/80 hover:bg-white/90 transition-all duration-200 
                shadow-[0_2px_10px_0_rgb(0,0,0,0.05)] rounded-lg
                hover:shadow-[0_4px_16px_0_rgb(0,0,0,0.08)]
                dark:bg-black/60 dark:border-zinc-800/80 dark:hover:bg-black/90">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground/70" />
                  <SelectValue placeholder="Flat Type" />
                </div>
              </SelectTrigger>
              <SelectContent 
                className="w-[var(--radix-select-trigger-width)] bg-white/90 backdrop-blur-sm 
                  border-zinc-200/80 shadow-lg rounded-lg overflow-hidden
                  dark:bg-black/90 dark:border-zinc-800/80"
                position="popper"
                sideOffset={5}
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {[
                    "1 ROOM",
                    "2 ROOM",
                    "3 ROOM",
                    "4 ROOM",
                    "5 ROOM",
                    "EXECUTIVE",
                    "MULTI-GENERATION"
                  ].map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="hover:bg-primary/5 cursor-pointer transition-all duration-200
                        data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary
                        data-[state=checked]:font-medium py-2.5 px-3"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
            <Button 
              size="lg" 
              onClick={handleSearch}
              disabled={loading}
              className="w-full md:w-[180px] bg-primary hover:bg-primary/90 text-white dark:text-white
                relative overflow-hidden transition-all duration-300
                shadow-[0_4px_14px_0_rgb(0,118,255,39%)]
                hover:shadow-[0_6px_20px_rgba(0,118,255,23%)]
                hover:scale-105 active:scale-100 rounded-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="w-5 h-5 border-t-2 border-r-2 border-white dark:border-white rounded-full animate-spin mr-2" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Get Valuation</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
          
          {/* Scroll Down Arrow */}
          <motion.div 
            className="mt-16 mb-4 flex justify-center cursor-pointer"
            onClick={scrollToFeatures}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              className="flex flex-col items-center"
              animate={{ y: [0, 10, 0] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <p className="text-sm text-muted-foreground mb-2">Discover More</p>
              <ChevronDown className="h-8 w-8 text-primary" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          id="features-section"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="pt-32 mt-32"
        >
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Main Features</h2>
            <div className="max-w-6xl mx-auto">
              <style jsx global>{`
                .bento-grid-container > div {
                  background: linear-gradient(to bottom right, white, var(--tw-gradient-to));
                  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                  border: 1px solid rgba(209, 213, 219, 0.5);
                  backdrop-filter: blur(8px);
                }
                
                :root {
                  --primary-rgb: 0, 118, 255;
                }
                
                .dark {
                  --primary-rgb: 56, 189, 248;
                }
                
                .bento-grid-container > div:nth-child(1) {
                  --tw-gradient-to: #EFF6FF;
                }
                
                .bento-grid-container > div:nth-child(2) {
                  --tw-gradient-to: #ECFDF5;
                }
                
                .bento-grid-container > div:nth-child(3) {
                  --tw-gradient-to: #F5F3FF;
                }
                
                .bento-grid-container > div:nth-child(4) {
                  --tw-gradient-to: #F0F9FF;
                }
                
                .bento-grid-container > div:nth-child(5) {
                  --tw-gradient-to: #FFFBEB;
                }
                
                .bento-grid-container > div:nth-child(6) {
                  --tw-gradient-to: #FFF1F2;
                }
                
                /* Dark mode styles */
                .dark .bento-grid-container > div {
                  background: linear-gradient(to bottom right, #111, var(--tw-gradient-to));
                  border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .dark .bento-grid-container > div:nth-child(1) {
                  --tw-gradient-to: #172554;
                }
                
                .dark .bento-grid-container > div:nth-child(2) {
                  --tw-gradient-to: #064E3B;
                }
                
                .dark .bento-grid-container > div:nth-child(3) {
                  --tw-gradient-to: #4C1D95;
                }
                
                .dark .bento-grid-container > div:nth-child(4) {
                  --tw-gradient-to: #082F49;
                }
                
                .dark .bento-grid-container > div:nth-child(5) {
                  --tw-gradient-to: #78350F;
                }
                
                .dark .bento-grid-container > div:nth-child(6) {
                  --tw-gradient-to: #881337;
                }
                
                /* Increase icon size on hover */
                .bento-grid-container > div:hover .icon-container {
                  transform: scale(1.1);
                }
                
                /* Light mode hover styles - shine effect */
                .bento-grid-container > div {
                  transition: all 0.3s ease;
                  position: relative;
                  overflow: hidden;
                }
                
                .bento-grid-container > div:hover {
                  transform: translateY(-2px);
                  box-shadow: none;
                }
                
                .bento-grid-container > div::before {
                  content: "";
                  position: absolute;
                  top: -50%;
                  left: -50%;
                  width: 200%;
                  height: 200%;
                  background: linear-gradient(
                    to bottom right,
                    rgba(255, 255, 255, 0),
                    rgba(255, 255, 255, 0),
                    rgba(255, 255, 255, 0.3),
                    rgba(255, 255, 255, 0)
                  );
                  transform: rotate(30deg);
                  opacity: 0;
                  transition: opacity 0.5s ease;
                  pointer-events: none;
                }
                
                .bento-grid-container > div:hover::before {
                  opacity: 1;
                  animation: shine 1.5s ease;
                }
                
                @keyframes shine {
                  0% {
                    transform: translateX(-100%) rotate(30deg);
                  }
                  100% {
                    transform: translateX(100%) rotate(30deg);
                  }
                }
                
                /* Dark mode hover styles can be stronger */
                .dark .bento-grid-container > div:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.4);
                  background: linear-gradient(to bottom right, #111, var(--tw-gradient-to));
                }
                
                /* Tag styles */
                .bento-grid-container .tag {
                  transition: all 0.3s ease;
                }
                
                .bento-grid-container > div:hover .tag {
                  background-color: rgba(var(--primary-rgb), 0.1);
                  color: rgba(var(--primary-rgb), 0.9);
                }
                
                /* Text shadow for better visibility */
                .text-shadow-sm {
                  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                
                .dark .text-shadow-sm {
                  text-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
              `}</style>
              <BentoGrid items={hdbFeatures} />
            </div>
          </div>
        </motion.div>

        {/* Why are we better? Comparison Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-32 max-w-6xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-10">Why are we better?</h2>
          
          <div className="overflow-hidden rounded-xl border border-gray-100/80 dark:border-white/10 bg-white dark:bg-black">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-900/70 text-left">
                    <th className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Features</th>
                    <th className="px-6 py-4 text-sm font-medium text-primary">
                      <div className="flex items-center">
                        <Image 
                          src="/logo.png" 
                          alt="ChatHDB" 
                          width={24} 
                          height={24} 
                          className="mr-2 block dark:hidden" 
                        />
                        <Image 
                          src="/logo_dark.png" 
                          alt="ChatHDB" 
                          width={24} 
                          height={24} 
                          className="mr-2 hidden dark:block" 
                        />
                        ChatHDB
                      </div>
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">99.co</th>
                    <th className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Ohmyhome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Advanced Valuation Models</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">Limited</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">Limited</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Economic Indicators Correlation</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Sentiment Analysis</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">AI Summary and Insights</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">Limited</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Instant Report Generation</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Area Analytics</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">Limited</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
