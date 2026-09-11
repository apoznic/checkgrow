import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Globe, 
  FileText, 
  Bot, 
  Zap, 
  Smartphone, 
  Link2, 
  BarChart3, 
  Palette, 
  Search,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  basePrice?: number;
  currency?: string;
}

const SERVICE_TYPES: ServiceType[] = [
  { id: 'webshop', name: 'E-commerce Webshop', description: 'Full e-commerce solution', icon: <ShoppingCart className="w-5 h-5" /> },
  { id: 'website', name: 'Corporate Website', description: 'Professional multi-page site', icon: <Globe className="w-5 h-5" /> },
  { id: 'landing_page', name: 'Landing Page', description: 'Single-page marketing', icon: <FileText className="w-5 h-5" /> },
  { id: 'ai_agent', name: 'AI Agent / Chatbot', description: 'Custom AI assistant', icon: <Bot className="w-5 h-5" /> },
  { id: 'automation', name: 'Business Automation', description: 'Workflow optimization', icon: <Zap className="w-5 h-5" /> },
  { id: 'mobile_app', name: 'Mobile Application', description: 'iOS & Android apps', icon: <Smartphone className="w-5 h-5" /> },
  { id: 'api_integration', name: 'API Integration', description: 'Third-party connections', icon: <Link2 className="w-5 h-5" /> },
  { id: 'data_analytics', name: 'Data Analytics', description: 'BI dashboards', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'branding', name: 'Brand Identity', description: 'Logo & visual identity', icon: <Palette className="w-5 h-5" /> },
  { id: 'seo_optimization', name: 'SEO Optimization', description: 'Search & content strategy', icon: <Search className="w-5 h-5" /> },
];

interface ServiceTypeSelectorProps {
  selected: string | null;
  onSelect: (serviceType: string) => void;
  pricing?: Record<string, { base_price: number; currency: string; estimated_hours: number }>;
  compact?: boolean;
}

export function ServiceTypeSelector({ selected, onSelect, pricing, compact = false }: ServiceTypeSelectorProps) {
  return (
    <div className={cn(
      "grid gap-2",
      compact ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    )}>
      {SERVICE_TYPES.map((service, index) => {
        const isSelected = selected === service.id;
        const servicePrice = pricing?.[service.id];
        
        return (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onSelect(service.id)}
            className={cn(
              "relative p-3 rounded-xl border text-left transition-all group",
              isSelected 
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                : "border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="service-check"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
              isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary"
            )}>
              {service.icon}
            </div>
            
            <p className={cn(
              "font-medium text-sm truncate",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {service.name}
            </p>
            
            {!compact && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {service.description}
              </p>
            )}
            
            {servicePrice && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-xs font-semibold text-primary">
                  €{servicePrice.base_price.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ~{servicePrice.estimated_hours}h
                </p>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export { SERVICE_TYPES };
