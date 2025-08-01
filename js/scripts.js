// Create animated stars
function createStars() {
    const starsContainer = document.getElementById('stars');
    const numberOfStars = 100;

    for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Random size
        const size = Math.random() * 3 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        
        // Random animation delay
        star.style.animationDelay = Math.random() * 3 + 's';
        
        starsContainer.appendChild(star);
    }
}

// Smooth scroll reveal animation
function revealOnScroll() {
    const sections = document.querySelectorAll('.tribute-section');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0.3s';
                entry.target.style.animationFillMode = 'both';
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        observer.observe(section);
    });
}

// Add subtle mouse interaction
function addMouseInteraction() {
    const container = document.querySelector('.container');
    
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        
        container.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
    });
}

// Animate floating symbols
function animateFloatingSymbols() {
    const symbols = document.querySelectorAll('.floating-symbol');
    
    symbols.forEach((symbol, index) => {
        symbol.style.animationDelay = (index * 1.5) + 's';
        
        // Add random gentle drift
        setInterval(() => {
            const currentTop = parseFloat(symbol.style.top);
            const currentLeft = parseFloat(symbol.style.left);
            
            const newTop = currentTop + (Math.random() - 0.5) * 2;
            const newLeft = currentLeft + (Math.random() - 0.5) * 2;
            
            symbol.style.top = Math.max(5, Math.min(95, newTop)) + '%';
            symbol.style.left = Math.max(5, Math.min(95, newLeft)) + '%';
        }, 5000 + Math.random() * 5000);
    });
}

// Add click interaction to achievements
function addAchievementInteractions() {
    const achievements = document.querySelectorAll('.achievement');
    
    achievements.forEach(achievement => {
        achievement.addEventListener('click', () => {
            achievement.style.transform = 'scale(1.05)';
            achievement.style.background = 'rgba(255, 215, 0, 0.3)';
            
            setTimeout(() => {
                achievement.style.transform = 'scale(1)';
                achievement.style.background = 'rgba(255, 215, 0, 0.1)';
            }, 200);
        });
    });
}

// Initialize everything when page loads
function initializePage() {
    createStars();
    revealOnScroll();
    addMouseInteraction();
    animateFloatingSymbols();
    addAchievementInteractions();
    
    // Add a gentle fade-in to the whole page
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 1s ease-in';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 