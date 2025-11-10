import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Waves, Music, Users, Zap, ArrowRight, LogIn, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import heroImage from "@/assets/hero-dashboard.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero overflow-hidden">
      {/* Navigation */}
      <motion.header 
        className="container mx-auto px-6 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.div 
              className="bg-gradient-primary p-2 rounded-lg shadow-glow"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Waves className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">SoundCloud Groups</h1>
              <p className="text-xs text-white/70">Artist Influence</p>
            </div>
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.button
              className="text-white/60 hover:text-white/80 text-sm flex items-center gap-1.5 transition-colors"
              onClick={() => navigate("/auth?admin=true")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="h-3.5 w-3.5" />
              Admin Login
            </motion.button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => navigate("/preview")}
              >
                Preview Tool
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                className="bg-white/10 text-white hover:bg-white/20 gap-2"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left" className="space-y-8">
            <div className="space-y-4">
              <motion.h1 
                className="text-6xl lg:text-7xl font-bold text-white leading-tight"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Grow Your
                <br />
                <motion.span 
                  className="bg-gradient-secondary bg-clip-text text-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  Music Career
                </motion.span>
              </motion.h1>
              <motion.p 
                className="text-xl text-white/80 leading-relaxed max-w-lg"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Join Artist Influence's exclusive SoundCloud engagement groups. 
                Connect with fellow artists, grow your reach, and build meaningful 
                relationships in the music community.
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6 gap-2"
                  onClick={() => navigate("/auth")}
                >
                  Join the Community
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
                  onClick={() => navigate("/preview")}
                >
                  Preview Your Support
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="grid grid-cols-3 gap-6 pt-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {500.toLocaleString()}+
                </div>
                <div className="text-white/70 text-sm">Active Artists</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {10000.toLocaleString()}+
                </div>
                <div className="text-white/70 text-sm">Tracks Supported</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {50.toLocaleString()}+
                </div>
                <div className="text-white/70 text-sm">Genres Covered</div>
              </div>
            </motion.div>
          </ScrollReveal>

          <ScrollReveal direction="right" className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              className="transition-transform duration-300"
            >
              <img 
                src={heroImage} 
                alt="SoundCloud Groups Dashboard" 
                className="w-full rounded-xl shadow-intense border border-white/20"
              />
              <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-xl" />
            </motion.div>
          </ScrollReveal>
        </div>
      </main>

      {/* Features Section */}
      <ScrollReveal className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <motion.h2 
            className="text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          <motion.p 
            className="text-white/80 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Our smart system matches you with artists in your genre for genuine, 
            balanced engagement that helps everyone grow.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Music,
              title: "Submit Your Track",
              description: "Upload your SoundCloud link and let our AI analyze your genre and style automatically.",
              gradient: "bg-gradient-primary",
              delay: 0
            },
            {
              icon: Users,
              title: "Get Matched",
              description: "Our fairness algorithm connects you with artists who match your genre and engagement level.",
              gradient: "bg-gradient-secondary",
              delay: 0.2
            },
            {
              icon: Zap,
              title: "Grow Together",
              description: "Receive genuine reposts, likes, and comments while supporting others in return.",
              gradient: "bg-gradient-to-r from-accent to-secondary",
              delay: 0.4
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center group hover:bg-white/15 transition-all duration-300"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: feature.delay }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <motion.div 
                className={`${feature.gradient} p-4 rounded-xl w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all duration-300`}
                whileHover={{ rotate: 5, scale: 1.1 }}
              >
                <feature.icon className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-white/70">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </ScrollReveal>

      {/* CTA Section */}
      <ScrollReveal className="container mx-auto px-6 py-16">
        <motion.div 
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 text-center hover:bg-white/15 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.h2 
            className="text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to Amplify Your Music?
          </motion.h2>
          <motion.p 
            className="text-white/80 text-lg mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join hundreds of artists who are already growing their SoundCloud presence 
            through our community-driven engagement platform.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6 gap-2"
                onClick={() => navigate("/auth")}
              >
                Start Your Journey
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
                onClick={() => navigate("/preview")}
              >
                Try Preview Tool
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </ScrollReveal>

      {/* Footer */}
      <motion.footer 
        className="container mx-auto px-6 py-8 border-t border-white/20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div 
              className="bg-gradient-primary p-1.5 rounded-lg"
              whileHover={{ rotate: 5 }}
            >
              <Waves className="h-4 w-4 text-white" />
            </motion.div>
            <div>
              <p className="text-white font-medium">SoundCloud Groups</p>
              <p className="text-white/70 text-xs">by Artist Influence</p>
            </div>
          </motion.div>
          <div className="text-white/70 text-sm">
            © 2024 Artist Influence. All rights reserved.
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
