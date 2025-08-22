import Link from "next/link";

export function AboutSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">
              About LPC Sara Clarke
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              With years of experience in mental health counseling, Sara Clarke 
              specializes in helping individuals, couples, and families navigate through 
              life&apos;s challenges with compassion and evidence-based therapeutic approaches.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              She holds a Masters in Clinical Mental Health Counseling and is a Licensed Professional 
              Counselor Associate (LPC-A) committed to creating a safe, non-judgmental space where 
              healing and growth can flourish.
            </p>
            
            <div className="mb-8">
              <h3 className="font-semibold text-foreground mb-4">Specializations</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Anxiety &amp; Depression
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Trauma &amp; PTSD
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Relationship Issues
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Life Transitions
                </li>
              </ul>
            </div>

            <Link
              href="/about"
              className="inline-flex items-center justify-center px-6 py-3 font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
            >
              Learn More About Sara Clarke
            </Link>
          </div>
          
          <div className="lg:pl-12">
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/30 rounded-2xl flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <svg className="w-24 h-24 mx-auto mb-4 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p>Professional Photo</p>
                <p className="text-sm">(To be added)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}