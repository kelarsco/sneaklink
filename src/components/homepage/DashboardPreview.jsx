import { useState, useRef, useEffect } from "react";
import { Filter, Download, Globe, X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import dashboardPreviewDark from "@/assets/images/dashboard-preview.png";
import dashboardPreviewLight from "@/assets/images/dashboard-preview-wt.png";


const features = [
  { icon: Filter, label: "Advanced Filters", description: "Filter by country, theme, date, and tags" },
  { icon: Globe, label: "Global Coverage", description: "Access stores from 190+ countries" },
  { icon: Download, label: "Export Data", description: "Export to CSV for further analysis" },
];

const DashboardPreview = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else if (isOpen) {
            setIsOpen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <section id="dashboard" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary text-sm font-normal uppercase tracking-wider">Dashboard</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-4 mb-6 text-foreground">
            Everything You Need in <span className="gradient-text">One Place</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            A powerful, intuitive dashboard designed for efficient store discovery and data export.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Features List */}
          <div className="space-y-6 order-2 lg:order-1">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.label} className="flex items-start gap-4 glass-panel p-5 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-normal text-foreground mb-1">{feature.label}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Video Preview */}
          <div className="order-1 lg:order-2">
<div 
  className="glass-panel p-3 glow-effect cursor-pointer group relative overflow-hidden rounded-xl"
  onClick={() => setIsOpen(true)}
>
  {/* Dark Mode Video Thumbnail */}
  <div className="hidden dark:block">
    <video
      ref={videoRef}
      className="w-full rounded-lg"
      muted
      loop
      playsInline
      poster={dashboardPreviewDark}
    >
      <source src="/videos/dashboard-preview-dark.mp4" type="video/mp4" />
    </video>
  </div>
  
  {/* Light Mode Video Thumbnail */}
  <div className="dark:hidden">
    <video
      ref={videoRef}
      className="w-full rounded-lg"
      muted
      loop
      playsInline
      poster={dashboardPreviewLight}
    >
      <source src="/videos/dashboard-preview-light.mp4" type="video/mp4" />
    </video>
  </div>
  
  {/* Play Button Overlay */}
  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-100 transition-opacity">
    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform">
      <Play className="w-8 h-8 text-primary" />
    </div>
  </div>
</div>

            
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              setIsPlaying(false);
            }
          }}
        >
          <button
            onClick={() => {
              setIsOpen(false);
              setIsPlaying(false);
            }}
            className="absolute top-6 right-6 text-white hover:text-primary transition-colors z-10"
            aria-label="Close video"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative w-full max-w-6xl">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              autoPlay
              controls={false}
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
            >
              <source 
                src={document.documentElement.classList.contains('dark') 
                  ? "/videos/dashboard-preview-dark.mp4" 
                  : "/videos/dashboard-preview-light.mp4"
                } 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
            
            {/* Custom Controls */}
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-4 py-2 flex items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={togglePlayPause}
                className="text-white hover:text-primary transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <div className="h-6 w-px bg-white/30" />
              
              <button 
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              <div className="h-6 w-px bg-white/30" />
              
              <button 
                onClick={toggleFullscreen}
                className="text-white hover:text-primary transition-colors"
                aria-label={isFullscreen ? "Minimize" : "Maximize"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardPreview;