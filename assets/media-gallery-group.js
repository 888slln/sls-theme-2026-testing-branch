window.addEventListener('DOMContentLoaded',function(){
if (!customElements.get("media-gallery-group")){
    customElements.define("media-gallery-group", class MediaGalleryGroup extends HTMLElement {
       constructor() {
          super();
          var _this = this,
            secId = this.dataset.section;
          this.el = {
            main: this.querySelector('.primgSlider'),
            thumb: this.querySelector('.pr_thumbs'),
            thumbPos: this.querySelector('.thumbs_nav.bottom'),
            pstyle: this.dataset.style
          };
          this.mql = window.matchMedia('(min-width: 767px)');
          this.init();

          this.imgZoom = this.querySelectorAll(".przoom");
          if(this.imgZoom.length > 0) this.zoomImage();
         
         var variants = document.querySelector(`#variant-selects-${secId}`),
           vopts = variants.querySelectorAll('select, .swatchInput.clr');
         vopts.forEach((opt) => {
           opt.addEventListener("change", function(){
             var vl = opt.value,
               gl = _this.dataset.color;
             if(vl == gl){
               _this.classList.remove('hide');
               _this.init();
             } else {
               _this.classList.add('hide');
             }
           });
         });
       }
       zoomImage(){
          this.imgZoom.forEach((img) => {
            new Drift(img, {
          		inlinePane: true,
                zoomFactor: 2,
          	});
          });
       }
       init(){
          this.enableSwiper(this);
          this.checkBreakpoint();
       }
       getDirection(){
          if (this.el.thumbPos != null) {
            var direction = "horizontal";
          } else {
            var direction = window.innerWidth >= 767 ? "vertical" : "horizontal";
          }
          return direction;
        }
        enableSwiper(){
            //var isSwiper = this.el.main.classList.contains('swiper-initialized');
            //if(isSwiper) return;
            var swiperOptions = JSON.parse(this.el.main.getAttribute("data-swiper"));
            if(window.innerWidth < 768) {
              swiperOptions.speed = 900;
              swiperOptions.threshold = 6;
              swiperOptions.longSwipesRatio = 0.18;
              swiperOptions.resistanceRatio = 0.62;
            }
            this.prslider = new Swiper(this.el.main, swiperOptions);
            this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            var pslider = this.prslider;
            this.prslider.on("slideChange", function(){
                var slides = pslider.slides;
                for (var i = 0; i < slides.length; i++) {
                  var video = slides[i].querySelector('video');
                  if(video){
                      if(i === pslider.activeIndex) {
                          video.play();
                      } else {
                          video.pause();
                      }
                  }
                }
            });
        }
        checkBreakpoint(){
            if(this.el.pstyle != "1" && this.el.pstyle != "5"){
              if (this.mql.matches === true) {
                if(this.prslider !== undefined) this.prslider.destroy();
              } else if (this.mql.matches === false){
                this.prslider.init();
                this.prslider.thumbs.swiper.changeDirection(this.getDirection());
              }
            } else {
              this.prslider.init();
              this.prslider.thumbs.swiper.changeDirection(this.getDirection());
            }
        }
      }
    );
}
});
const mediaGalleryGroups = document.querySelectorAll(`media-gallery-group`);
  window.addEventListener("resize", (event) => {
     mediaGalleryGroups.forEach((group) => {
      group.init();
    });
  });
