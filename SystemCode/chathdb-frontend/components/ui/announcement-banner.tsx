import { FC, useState } from "react";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import YouTubeDialog from "@/components/YouTubeDialog";

interface AnnouncementBannerProps {
  className?: string;
  text: string;
  link: string;
}

const AnnouncementBanner: FC<AnnouncementBannerProps> = ({
  className,
  text,
  link
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  const videoId = getYouTubeVideoId(link) || "";
  
  return (
    <>
      <div className="w-full flex justify-center">
        <button 
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            "group rounded-full border border-black/5 bg-neutral-100 text-base transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
            className
          )}
        >
          <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
            <span>{text}</span>
            <ExternalLink className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </AnimatedShinyText>
        </button>
      </div>
      
      {/* YouTube Video Dialog */}
      <YouTubeDialog 
        videoId={videoId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};

export { AnnouncementBanner }; 