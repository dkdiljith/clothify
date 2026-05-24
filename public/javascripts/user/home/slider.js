
document.addEventListener(
    "DOMContentLoaded",
    function () {

        const slides =
            document.querySelectorAll(
                '.custom-slide'
            );

        const dots =
            document.querySelectorAll(
                '.slider-dot'
            );

        const prevBtn =
            document.querySelector(
                '.prev-arrow'
            );

        const nextBtn =
            document.querySelector(
                '.next-arrow'
            );

        let currentSlide = 0;

        let slideInterval;


        function showSlide(index) {

            slides[currentSlide].classList.remove(
                'active'
            );

            dots[currentSlide].classList.remove(
                'active'
            );


            currentSlide =
                (index + slides.length)
                % slides.length;


            slides[currentSlide].classList.add(
                'active'
            );

            dots[currentSlide].classList.add(
                'active'
            );

        }


        function nextSlide() {
            showSlide(currentSlide + 1);
        }


        function prevSlide() {
            showSlide(currentSlide - 1);
        }


        function startAutoplay() {

            clearInterval(slideInterval);

            slideInterval = setInterval(
                nextSlide,
                6000
            );

        }


        nextBtn.addEventListener(
            'click',
            () => {

                nextSlide();

                startAutoplay();

            }
        );


        prevBtn.addEventListener(
            'click',
            () => {

                prevSlide();

                startAutoplay();

            }
        );


        dots.forEach(
            (dot) => {

                dot.addEventListener(
                    'click',
                    (e) => {

                        const index = parseInt(
                            e.target.getAttribute(
                                'data-index'
                            )
                        );

                        showSlide(index);

                        startAutoplay();

                    }
                );

            }
        );


        startAutoplay();

    }
);