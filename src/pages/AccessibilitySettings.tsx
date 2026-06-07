import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Type from 'lucide-react/dist/esm/icons/type';
import Contrast from 'lucide-react/dist/esm/icons/contrast';
import { useToast } from '@/hooks/use-toast';

const FONT_SIZE_ID = 'cinetrekker_font_size';
const HIGH_CONTRAST_ID = 'cinetrekker_high_contrast';
const REDUCE_MOTION_ID = 'cinetrekker_reduce_motion';

export default function AccessibilitySettings() {
  const { toast } = useToast();
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_ID);
      return stored ? parseInt(stored) : 100;
    } catch {
      return 100;
    }
  });
  
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIGH_CONTRAST_ID) === 'true';
    } catch {
      return false;
    }
  });
  
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REDUCE_MOTION_ID) === 'true';
    } catch {
      return false;
    }
  });

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem(FONT_SIZE_ID, fontSize.toString());
  }, [fontSize]);

  // Apply high contrast
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem(HIGH_CONTRAST_ID, highContrast.toString());
  }, [highContrast]);

  // Apply reduce motion
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    localStorage.setItem(REDUCE_MOTION_ID, reduceMotion.toString());
  }, [reduceMotion]);

  const resetToDefaults = () => {
    setFontSize(100);
    setHighContrast(false);
    setReduceMotion(false);
    toast({
      title: 'Settings Reset',
      description: 'All accessibility settings have been reset to defaults.',
    });
  };

  return (
    <>
      <SEO 
        title="Accessibility Settings"
        description="Customize your viewing experience with accessibility options"
      />
      
      <div className="page-container pt-20 pb-24 md:pb-0">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Accessibility Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your experience for better readability and usability
            </p>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Font Size Control */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Type className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-lg font-semibold">Font Size</Label>
                <p className="text-sm text-muted-foreground">
                  Adjust text size throughout the app
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm w-16">Small</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={80}
                  max={150}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm w-16 text-right">Large</span>
              </div>
              
              <div className="text-center">
                <span className="text-2xl font-bold">{fontSize}%</span>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm">
                  Preview: This is how text will look at {fontSize}% size. 
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>
          </Card>

          {/* High Contrast Mode */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Contrast className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-lg font-semibold">High Contrast Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Increase contrast for better visibility
                  </p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={setHighContrast}
                aria-label="Toggle high contrast mode"
              />
            </div>
          </Card>

          {/* Reduce Motion */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-lg font-semibold">Reduce Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations and transitions
                  </p>
                </div>
              </div>
              <Switch
                checked={reduceMotion}
                onCheckedChange={setReduceMotion}
                aria-label="Toggle reduce motion"
              />
            </div>
          </Card>

          {/* Other Accessibility Features */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-3">Additional Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Keyboard navigation support throughout the app</li>
              <li>✓ Screen reader compatible with ARIA labels</li>
              <li>✓ Focus indicators for better navigation</li>
              <li>✓ Skip to content links</li>
              <li>✓ Alt text for all images</li>
            </ul>
          </Card>

          {/* Reset Button */}
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className="w-full"
          >
            Reset to Default Settings
          </Button>
        </div>
      </div>
    </>
  );
}
