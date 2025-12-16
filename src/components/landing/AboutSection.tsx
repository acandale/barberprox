import { CheckCircle, Award, Users, Shield } from "lucide-react";

const features = [
  {
    icon: <Award className="h-6 w-6" />,
    title: "Expert Barbers",
    description: "Our team consists of certified professionals with years of experience",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Personalized Service",
    description: "Every cut is tailored to your unique style and preferences",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Hygiene First",
    description: "We maintain the highest standards of cleanliness and safety",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <span className="text-sm font-semibold text-purple uppercase tracking-wider">
              About Us
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
              Crafting Confidence,{" "}
              <span className="text-gradient">One Cut at a Time</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              With over a decade of experience in the industry, BarberPro has become synonymous with excellence in men's grooming. Our skilled barbers combine traditional techniques with modern trends to deliver results that exceed expectations.
            </p>

            <div className="space-y-4">
              {["Premium quality products", "Appointment flexibility", "Satisfaction guaranteed"].map(
                (item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-purple" />
                    <span className="text-foreground">{item}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="p-3 rounded-lg bg-purple/10 text-purple shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
