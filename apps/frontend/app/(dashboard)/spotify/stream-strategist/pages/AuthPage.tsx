"use client"

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function AuthPage() {
  const { user, currentRole, signIn, signUp, loading } = useAuth();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const from = location.state?.from?.pathname || getRoleBasedRedirect(selectedRole);

  function getRoleBasedRedirect(role: string) {
    switch (role) {
      case 'admin':
      case 'manager':
        return '/';
      case 'salesperson':
        return '/salesperson';
      case 'vendor':
        return '/vendor';
      default:
        return '/';
    }
  }

  useEffect(() => {
    if (user && currentRole) {
      // Redirect to the selected role's dashboard
      const redirectPath = getRoleBasedRedirect(selectedRole);
      window.location.href = redirectPath;
    }
  }, [user, currentRole, selectedRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && currentRole) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        toast.error(error.message);
      } else {
        // Redirect based on selected role after successful login
        const redirectPath = getRoleBasedRedirect(selectedRole);
        window.location.href = redirectPath;
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password);
      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoVendorAccess = async () => {
    setIsLoading(true);
    setSelectedRole('vendor');
    
    // Set the demo credentials
    setFormData({
      email: 'jared@artistinfluence.com',
      password: 'Emperean1!',
      confirmPassword: ''
    });

    try {
      const { error } = await signIn('jared@artistinfluence.com', 'Emperean1!');
      if (error) {
        toast.error(error.message);
      } else {
        // Redirect to vendor dashboard
        window.location.href = '/vendor';
      }
    } catch (error) {
      toast.error('Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Artist Influence</CardTitle>
          <CardDescription>
            Select your role and sign in to access your dashboard
          </CardDescription>
        </CardHeader>

        {/* Role Selection */}
        <div className="px-6 pb-4">
          <Label htmlFor="role-select">Select Your Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Choose your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="salesperson">Salesperson</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            You'll be redirected to your role-specific dashboard
          </p>
        </div>
        
        {/* Demo Vendor Access */}
        <div className="px-6 pb-4">
          <div className="border-t border-border pt-4">
            <Button 
              type="button"
              variant="outline" 
              className="w-full"
              onClick={handleDemoVendorAccess}
              disabled={isLoading}
            >
              🎵 Demo Vendor Access
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Quick access to vendor dashboard for demo purposes
            </p>
          </div>
        </div>
        
        {/* Sign In Form */}
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : `Sign In as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}








