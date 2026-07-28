/* Lets a reader patch any broken image on the page (missing/unavailable
   foryou-assets files) by clicking an overlay and picking a local file.
   Delegated on document with the capture phase because the img "error"
   event does not bubble, so this also catches images from partials
   (partials/aj-foryou-feed.html etc.) that load after this script runs. */
(function () {
  'use strict';

  function addOverlay(img) {
    if (img.dataset.ajUploadReady) return;
    img.dataset.ajUploadReady = '1';

    var host = img.parentElement;
    if (!host) return;
    var hostStyle = getComputedStyle(host);
    if (hostStyle.position === 'static') host.style.position = 'relative';

    img.style.visibility = 'hidden';

    var label = document.createElement('label');
    label.className = 'aj-img-upload';
    label.innerHTML = '<span class="aj-img-upload__icon">+</span><span class="aj-img-upload__text">Upload image</span>';

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    label.appendChild(input);

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        img.src = reader.result;
        img.style.visibility = '';
        label.remove();
      };
      reader.readAsDataURL(file);
    });

    host.appendChild(label);
  }

  function onError(e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    addOverlay(img);
  }

  function sweepExisting() {
    [].forEach.call(document.querySelectorAll('img'), function (img) {
      if (img.complete && img.naturalWidth === 0 && img.src) addOverlay(img);
    });
  }

  document.addEventListener('error', onError, true);
  document.addEventListener('DOMContentLoaded', sweepExisting);
  // Partials (feed/stories/footer) are injected async after DOMContentLoaded.
  setTimeout(sweepExisting, 1200);
  setTimeout(sweepExisting, 3000);
})();
