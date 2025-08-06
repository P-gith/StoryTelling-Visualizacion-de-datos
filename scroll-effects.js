// Simplified Scroll Effects - Only Section Animations
class SimpleScrollEffects {
    constructor() {
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.currentSection = 0;
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        if (this.isReducedMotion) {
            this.initReducedMotionMode();
            return;
        }

        // Wait for GSAP to load
        if (typeof gsap === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        
        this.setupSectionAnimations();
        this.setupChartAnimations();
    }

    initReducedMotionMode() {
        const sections = document.querySelectorAll('.story-section');
        sections.forEach(section => {
            section.style.opacity = '1';
            section.style.transform = 'none';
        });
    }

    setupSectionAnimations() {
        const sections = document.querySelectorAll('.story-section');
        
        sections.forEach((section, index) => {
            ScrollTrigger.create({
                trigger: section,
                start: 'top 70%',
                end: 'bottom 30%',
                onEnter: () => {
                    this.animateSection(section, index);
                }
            });
        });
    }

    animateSection(section, index) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Animate section title
        const title = section.querySelector('h2');
        if (title) {
            gsap.fromTo(title,
                { opacity: 0, y: 30 },
                { 
                    opacity: 1, 
                    y: 0, 
                    duration: 0.8, 
                    ease: 'power2.out'
                }
            );
        }

        // Animate narrative paragraphs
        const paragraphs = section.querySelectorAll('.narrative p');
        if (paragraphs.length > 0) {
            gsap.fromTo(paragraphs,
                { opacity: 0, y: 20 },
                { 
                    opacity: 1, 
                    y: 0, 
                    duration: 0.6, 
                    stagger: 0.2, 
                    ease: 'power2.out',
                    delay: 0.3
                }
            );
        }

        // Animate visualization container
        const visualization = section.querySelector('.visualization');
        if (visualization) {
            gsap.fromTo(visualization,
                { opacity: 0, scale: 0.95 },
                { 
                    opacity: 1, 
                    scale: 1, 
                    duration: 0.8, 
                    ease: 'power2.out',
                    delay: 0.5,
                    onComplete: () => {
                        this.isAnimating = false;
                    }
                }
            );
        } else {
            this.isAnimating = false;
        }
    }

    setupChartAnimations() {
        // Use intersection observer for chart animations
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                        entry.target.classList.add('animated');
                        this.triggerChartAnimation(entry.target);
                    }
                });
            },
            { threshold: 0.3, rootMargin: '50px' }
        );

        document.querySelectorAll('.visualization').forEach(viz => {
            observer.observe(viz);
        });
    }

    triggerChartAnimation(vizElement) {
        const vizId = vizElement.id;
        
        // Delay the chart animation slightly after container animation
        setTimeout(() => {
            switch(vizId) {
                case 'overview-viz':
                    this.animateStatsCards();
                    break;
                case 'ratings-viz':
                    this.animateRatingsHistogram();
                    break;
                case 'genres-viz':
                    this.animateGenresChart();
                    break;
                case 'duration-viz':
                    this.animateDurationScatter();
                    break;
                case 'top-content-viz':
                    this.animateTopContentList();
                    break;
            }
        }, 300);
    }

    animateStatsCards() {
        // No animation for overview cards to avoid positioning issues
        return;
    }

    animateRatingsHistogram() {
        const bars = document.querySelectorAll('#ratings-viz rect, #ratings-viz .bar');
        
        if (bars.length === 0) return;
        
        gsap.fromTo(bars,
            { scaleY: 0, transformOrigin: 'bottom' },
            { 
                scaleY: 1,
                duration: 0.8,
                stagger: 0.05,
                ease: 'power2.out'
            }
        );
    }

    animateGenresChart() {
        const bars = document.querySelectorAll('#genres-viz rect, #genres-viz .genre-bar');
        
        if (bars.length === 0) return;
        
        gsap.fromTo(bars,
            { scaleX: 0, transformOrigin: 'left' },
            { 
                scaleX: 1,
                duration: 0.8,
                stagger: 0.08,
                ease: 'power2.out'
            }
        );
    }

    animateDurationScatter() {
        // Optimización: animar solo los primeros 100 puntos para mejor performance
        const circles = document.querySelectorAll('#duration-viz circle, #duration-viz .dot');
        
        if (circles.length === 0) return;
        
        // Limitar la cantidad de elementos a animar
        const maxElements = Math.min(circles.length, 100);
        const elementsToAnimate = Array.from(circles).slice(0, maxElements);
        
        gsap.fromTo(elementsToAnimate,
            { scale: 0, opacity: 0 },
            { 
                scale: 1,
                opacity: 0.8,
                duration: 0.4,
                stagger: 0.005, // Reducir stagger para mejor performance
                ease: 'power2.out'
            }
        );
        
        // Animar los elementos restantes sin stagger si los hay
        if (circles.length > maxElements) {
            const remainingElements = Array.from(circles).slice(maxElements);
            gsap.fromTo(remainingElements,
                { scale: 0, opacity: 0 },
                { 
                    scale: 1,
                    opacity: 0.8,
                    duration: 0.3,
                    delay: 0.2,
                    ease: 'power2.out'
                }
            );
        }
    }

    animateTopContentList() {
        const items = document.querySelectorAll('#top-content-viz .content-item, #top-content-viz li');
        
        if (items.length === 0) return;
        
        gsap.fromTo(items,
            { x: 30, opacity: 0 },
            { 
                x: 0,
                opacity: 1,
                duration: 0.5,
                stagger: 0.05,
                ease: 'power2.out'
            }
        );
    }

    // Cleanup method
    destroy() {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    }
}

// Basic styles - no immersive effects
const basicStyles = `
/* Basic responsive design */
@media (max-width: 768px) {
    .story-section {
        padding: 40px 15px;
    }
}

/* Smooth scrolling */
html {
    scroll-behavior: smooth;
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation: none !important;
        transition: none !important;
    }
    
    html {
        scroll-behavior: auto;
    }
}
`;

// Add basic styles to document
const basicStyleSheet = document.createElement('style');
basicStyleSheet.textContent = basicStyles;
document.head.appendChild(basicStyleSheet);

// Initialize with simple effects
let scrollEffectsInstance = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!scrollEffectsInstance) {
            scrollEffectsInstance = new SimpleScrollEffects();
        }
    });
} else {
    if (!scrollEffectsInstance) {
        scrollEffectsInstance = new SimpleScrollEffects();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (scrollEffectsInstance && scrollEffectsInstance.destroy) {
        scrollEffectsInstance.destroy();
    }
});
