// WAFT V2 mobile-landscape arena refinement.
// The legacy mobile CSS forced portrait fighter artwork into a shallow 145px
// crop. Stretch fighter cards with the combat row instead and spend the former
// dead space on the artwork, keeping the important fighter HUD below it.

const STYLE_ID = "waft-mobile-arena-layout-v2";

export function installMobileArenaLayoutV2() {
  if (typeof document === "undefined") return false;
  if (document.getElementById(STYLE_ID)) return true;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media (orientation: landscape) and (max-height: 620px) and (max-width: 1200px) {
      .combat-shell {
        align-items: stretch !important;
      }

      .combat-shell > .fighter-card {
        align-self: stretch !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 100% !important;
      }

      .combat-shell > .fighter-card > .fighter-image-wrap {
        aspect-ratio: auto !important;
        height: auto !important;
        min-height: clamp(170px, 48vh, 270px) !important;
        flex: 1 1 auto !important;
      }

      .combat-shell > .fighter-card > .fighter-image-wrap img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: center top !important;
      }

      .combat-shell > .fighter-card > .fighter-info {
        flex: 0 0 auto !important;
      }
    }

    @media (orientation: landscape) and (max-height: 440px) and (max-width: 900px) {
      .combat-shell > .fighter-card > .fighter-image-wrap {
        min-height: clamp(150px, 46vh, 205px) !important;
      }
    }
  `;

  document.head.appendChild(style);
  return true;
}

installMobileArenaLayoutV2();
