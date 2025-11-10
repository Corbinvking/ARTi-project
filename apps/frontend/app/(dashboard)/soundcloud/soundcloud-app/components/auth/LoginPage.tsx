"use client"

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { Music, Waves, Zap, Shield } from "lucide-react";
import heroImage from "@/assets/hero-dashboard.jpg";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get("admin") === "true";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password);
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendMagicLink(email);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
            <div className="bg-gradient-primary p-3 rounded-xl shadow-glow">
              <Waves className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">SoundCloud Groups</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Grow Your Music
              <br />
              <span className="bg-gradient-secondary bg-clip-text text-transparent">
                Community
              </span>
            </h2>
            <p className="text-xl text-white/80 leading-relaxed">
              Join Artist Influence's exclusive SoundCloud engagement groups. 
              Connect with fellow artists, grow your reach, and build meaningful 
              relationships in the music community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Music className="h-6 w-6 text-accent mb-2" />
              <h3 className="font-semibold text-white mb-1">Genre Matching</h3>
              <p className="text-sm text-white/70">Smart algorithm matches you with artists in your genre</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Zap className="h-6 w-6 text-accent mb-2" />
              <h3 className="font-semibold text-white mb-1">Fair Exchange</h3>
              <p className="text-sm text-white/70">Balanced credit system ensures everyone gets equal support</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Waves className="h-6 w-6 text-accent mb-2" />
              <h3 className="font-semibold text-white mb-1">Real Engagement</h3>
              <p className="text-sm text-white/70">Genuine interactions from real artists, not bots</p>
            </div>
          </div>

          <img 
            src={heroImage} 
            alt="Music Dashboard" 
            className="w-full rounded-xl shadow-intense border border-white/20 hidden lg:block"
          />
        </div>

        {/* Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-border shadow-intense">
            <CardHeader className="text-center">
              {isAdminLogin && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Administrator Access</span>
                </div>
              )}
              <CardTitle className="text-2xl font-bold">
                {isAdminLogin ? "Admin Login" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {isAdminLogin 
                  ? "Access administrative functions and backend controls" 
                  : "Access your SoundCloud Groups dashboard"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:shadow-glow"
                      disabled={loading}
                    >
                      {loading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <Button 
                      type="submit"
                      variant="secondary" 
                      className="w-full"
                      disabled={loading || !email}
                    >
                      {loading ? "Sending..." : "Send Magic Link"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-secondary hover:shadow-glow"
                      disabled={loading}
                    >
                      {loading ? "Creating Account..." : "Sign Up"}
                    </Button>
                  </form>
                  <p className="text-sm text-muted-foreground text-center">
                    By signing up, you agree to our terms of service and privacy policy.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};