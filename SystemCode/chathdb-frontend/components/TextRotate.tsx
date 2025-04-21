import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TextEffect } from "@/components/ui/text-effect";

// Define props interface
interface TextRotateProps {
  texts: string[];
  mainClassName?: string;
  staggerDuration?: number;
  staggerFrom?: "first" | "last";
  rotationInterval?: number;
}

// Text rotation component
const TextRotate = ({ 
  texts, 
  mainClassName = "", 
  staggerDuration = 0.03, 
  staggerFrom = "last", 
  rotationInterval = 3000 
}: TextRotateProps) => {
  const [index, setIndex] = useState(0);
  const [trigger, setTrigger] = useState(true);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set initial container height on mount and when texts change
  useEffect(() => {
    // Find the longest text to determine max height
    if (containerRef.current) {
      // Give it some time to render the first text
      setTimeout(() => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight);
        }
      }, 100);
    }
  }, [texts]);

  // Handle rotation of texts
  useEffect(() => {
    const interval = setInterval(() => {
      setTrigger(false);
      
      // Wait for exit animation to complete
      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % texts.length);
        setTrigger(true);
      }, 500); // Adjust this timing to match exit animation duration
      
    }, rotationInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [rotationInterval, texts.length]);

  // Custom animation variants for bold black text effect
  const blurSlideVariants = {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: staggerDuration },
      },
      exit: {
        transition: { 
          staggerChildren: staggerDuration, 
          staggerDirection: staggerFrom === "first" ? 1 : -1 
        },
      },
    },
    item: {
      hidden: {
        opacity: 0,
        filter: 'blur(8px)',
        y: 5,
      },
      visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.3,
          ease: "easeOut",
        },
      },
      exit: {
        opacity: 0,
        y: -5,
        filter: 'blur(8px)',
        transition: {
          duration: 0.2,
          ease: "easeIn",
        },
      },
    },
  };
  
  return (
    <motion.div 
      className={`${mainClassName} relative flex justify-center w-full`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ 
        height: containerHeight > 0 ? containerHeight : 'auto',
        minHeight: '1.5em' // Provide a minimum height as fallback
      }}
    >
      <div 
        ref={containerRef} 
        className="flex justify-center items-center text-center w-full"
      >
        <TextEffect
          per="char"
          variants={blurSlideVariants}
          trigger={trigger}
          className="font-bold text-black dark:text-zinc-100 relative text-center"
        >
          {texts[index]}
        </TextEffect>
      </div>
    </motion.div>
  );
};

export default TextRotate; 