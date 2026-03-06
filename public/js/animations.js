(function () {
    'use strict';

    // --- Scroll Reveal (IntersectionObserver) ---
    var revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length && 'IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        revealElements.forEach(function (el) { observer.observe(el); });
    } else {
        // Fallback: show all immediately
        revealElements.forEach(function (el) { el.classList.add('revealed'); });
    }

    // --- Navbar shrink on scroll ---
    var navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // --- Back to Top button ---
    var backBtn = document.getElementById('back-to-top');
    if (backBtn) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 400) {
                backBtn.classList.add('visible');
            } else {
                backBtn.classList.remove('visible');
            }
        });
        backBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();
