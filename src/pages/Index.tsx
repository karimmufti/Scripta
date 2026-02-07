import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, FileText, Users, Mic, Play } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradient — warm dark red radial */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(0 30% 12%) 0%, hsl(0 40% 5%) 70%)' }}
        />
        
        {/* Content */}
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Async <span className="gradient-text">Table Reads</span> for Screenwriters
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your script, assign actors, and let them record their lines remotely. 
              We stitch everything together into one cohesive table read.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/writer">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  Start a Table Read
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* How it works */}
      <div className="py-20" style={{ background: 'hsl(0 25% 7%)' }}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="card-glow bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">1. Upload Script</h3>
                <p className="text-sm text-muted-foreground">
                  Paste your screenplay scene. We parse each line of dialogue automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-glow bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">2. Assign Actors</h3>
                <p className="text-sm text-muted-foreground">
                  Map each character to an actor. They get unique recording links.
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-glow bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">3. Record Lines</h3>
                <p className="text-sm text-muted-foreground">
                  Actors record in their browser—anytime, anywhere. Re-record until perfect.
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-glow bg-card/50 border-border/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">4. Generate</h3>
                <p className="text-sm text-muted-foreground">
                  We stitch all recordings together with room tone. Download your table read.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Features */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold">Built for Screenwriters</h2>
            
            <div className="grid sm:grid-cols-2 gap-6 text-left">
              <div className="p-6 rounded-lg border" style={{ background: 'hsl(0 20% 9%)', borderColor: 'hsl(0 12% 16%)' }}>
                <h3 className="font-semibold mb-2">Browser Recording</h3>
                <p className="text-sm text-muted-foreground">
                  Actors record directly in their browser. No apps to install.
                </p>
              </div>
              
              <div className="p-6 rounded-lg border" style={{ background: 'hsl(0 20% 9%)', borderColor: 'hsl(0 12% 16%)' }}>
                <h3 className="font-semibold mb-2">Shareable Links</h3>
                <p className="text-sm text-muted-foreground">
                  Each actor gets a unique link showing only their lines.
                </p>
              </div>
              
              <div className="p-6 rounded-lg border" style={{ background: 'hsl(0 20% 9%)', borderColor: 'hsl(0 12% 16%)' }}>
                <h3 className="font-semibold mb-2">Room Tone</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic ambient overlay makes it sound like one room.
                </p>
              </div>
              
              <div className="p-6 rounded-lg border" style={{ background: 'hsl(0 20% 9%)', borderColor: 'hsl(0 12% 16%)' }}>
                <h3 className="font-semibold mb-2">Easy Export</h3>
                <p className="text-sm text-muted-foreground">
                  Download the final table read as a single audio file.
                </p>
              </div>
            </div>
            
            <Link to="/writer">
              <Button size="lg" className="mt-8">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: 'hsl(0 12% 14%)' }}>
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TableRead.io — Async table reads for screenwriters</p>
        </div>
      </footer>
    </div>
  );
}
