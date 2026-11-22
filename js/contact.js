/* ==========================================================================
   Ilumi — the Contact page's form (contact.html)
   The form's action is its FormSubmit address. With JS the message is posted
   in the background to the same address with /ajax/ in it, asking for JSON
   back, and the card says it was sent only when FormSubmit answers
   success: "true". Before the address is activated FormSubmit answers false
   (and emails the owner an activation link), so the page says it failed.
   Without JS the browser posts the form itself and FormSubmit shows its own
   thank-you page. See README.md, "The Contact page".
   ========================================================================== */
(function () {
  "use strict";

  var CONTACT = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    says: {
      ready: "We’ll only use your email to write back.",
      noEmail: "Add your email so we can write back.",
      wrong: "That email doesn’t look quite right.",
      noMessage: "Write a message first.",
      busy: "Sending…",
      failed: "That didn’t go through. Please try again."
    }
  };

  function ajaxUrl(action) {
    return action.replace(/^https:\/\/formsubmit\.co\/(?!ajax\/)/, "https://formsubmit.co/ajax/");
  }

  function init() {
    var form = document.getElementById("contact-form");
    if (!form || !window.fetch || !window.FormData) return;
    var card = form.parentNode;
    var email = document.getElementById("contact-email");
    var message = document.getElementById("contact-message");
    var status = document.getElementById("contact-status");
    var go = form.querySelector(".contact-go");
    var label = form.querySelector(".contact-go-label");
    var done = card.querySelector(".contact-done");
    var resting = label.textContent;
    form.noValidate = true; // the page's own words instead of the browser's; without JS the browser checks

    function say(text, alert) {
      status.textContent = text;
      status.classList.toggle("is-alert", !!alert);
    }

    function refuse(input, text) {
      var field = input.closest(".contact-field");
      field.classList.remove("is-error");
      void field.offsetWidth; // restart the shake
      field.classList.add("is-error");
      say(text, true);
      input.focus();
    }

    function busy(on) {
      go.disabled = on;
      label.textContent = on ? CONTACT.says.busy : resting;
    }

    [email, message].forEach(function (input) {
      input.addEventListener("input", function () {
        input.closest(".contact-field").classList.remove("is-error");
        if (status.classList.contains("is-alert")) say(CONTACT.says.ready);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var address = email.value.trim();
      if (!address) return refuse(email, CONTACT.says.noEmail);
      if (!CONTACT.email.test(address)) return refuse(email, CONTACT.says.wrong);
      if (!message.value.trim()) return refuse(message, CONTACT.says.noMessage);

      busy(true);
      say(CONTACT.says.ready);
      fetch(ajaxUrl(form.action), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (String(data && data.success) !== "true") throw new Error("contact: " + (data && data.message));
          done.querySelector(".contact-done-email").textContent = address;
          form.hidden = true;
          done.hidden = false;
          done.focus();
        })
        .catch(function (err) {
          if (window.console) console.warn(err);
          busy(false);
          say(CONTACT.says.failed, true);
        });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
