import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Startup Founder",
    company: "TechVentures",
    content: "CheckGrow matched us with an incredible development team in less than 24 hours. The AI understood our needs perfectly.",
    avatar: "SJ",
    rating: 5,
  },
  {
    name: "Marcus Chen",
    role: "Product Manager",
    company: "InnovateCo",
    content: "The quality of talent on this platform is unmatched. Every team member we've hired exceeded our expectations.",
    avatar: "MC",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "CTO",
    company: "DataFlow",
    content: "As a freelancer, I've found amazing projects that perfectly match my skills. The platform is intuitive and efficient.",
    avatar: "ER",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            What people say
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Hear from teams and talent who've found success with CheckGrow
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 }}
              className="bg-card rounded-3xl p-8 border border-border"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-8 text-base">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-sm font-bold text-background">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
