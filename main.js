const { Plugin, PluginSettingTab, Setting } = require("obsidian");

const DEFAULT_SETTINGS = {
  enabled: true,
  // Core
  acceleration: 1.05,
  gravity: 1.5,
  opacity: 0.5,
  // Visual density
  intensity: 15,
  particles: 50,
  flickering: 50,
  // Motion
  traceLength: 3,
  traceSpeed: 5,
  // Explosion
  explosion: 5,
  lineWidth: 2,
  // Brightness
  brightnessMin: 50,
  brightnessMax: 80,
  // Timing
  delayMin: 100,
  delayMax: 150,
  // Launch zone
  rocketsMin: 50,
  rocketsMax: 100
};

module.exports = class GlobalFireworks extends Plugin {
  async onload() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
    this.addSettingTab(new FireworksSettingTab(this.app, this));
    if (this.settings.enabled) {
      this.startFireworks();
    }
  }

  onunload() {
    this.stopFireworks();
  }

  async saveSettings() {
    this.settings.particles = Math.min(this.settings.particles, 200);
    this.settings.intensity = Math.min(this.settings.intensity, 40);

    if (this.settings.delayMin > this.settings.delayMax) {
      [this.settings.delayMin, this.settings.delayMax] =
        [this.settings.delayMax, this.settings.delayMin];
    }
    if (this.settings.brightnessMin > this.settings.brightnessMax) {
      [this.settings.brightnessMin, this.settings.brightnessMax] =
        [this.settings.brightnessMax, this.settings.brightnessMin];
    }
    if (this.settings.rocketsMin > this.settings.rocketsMax) {
      [this.settings.rocketsMin, this.settings.rocketsMax] =
        [this.settings.rocketsMax, this.settings.rocketsMin];
    }
    await this.saveData(this.settings);
  }

  startFireworks() {
    if (!this.settings.enabled) return;
    if (document.querySelector(".fireworks-container")) return;
    
    const container = document.createElement("div");
    container.className = "fireworks-container";
    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "999999"
    });
    document.body.appendChild(container);

    if (window.Fireworks) {
      this.initFireworks(container);
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/fireworks-js@2.x/dist/index.umd.js";
      script.onload = () => this.initFireworks(container);
      document.head.appendChild(script);
    }
  }

  initFireworks(container) {
    const s = this.settings;
    this.fireworks = new Fireworks.default(container, {
      autoresize: true,
      acceleration: s.acceleration,
      gravity: s.gravity,
      opacity: s.opacity,
      intensity: s.intensity,
      particles: s.particles,
      flickering: s.flickering,
      traceLength: s.traceLength,
      traceSpeed: s.traceSpeed,
      explosion: s.explosion,
      lineWidth: {
        explosion: { min: 1, max: s.lineWidth },
        trace: { min: 1, max: s.lineWidth }
        },
      brightness: {
        min: s.brightnessMin,
        max: s.brightnessMax
      },
      delay: {
        min: s.delayMin,
        max: s.delayMax
      },
      rocketsPoint: {
        min: s.rocketsMin,
        max: s.rocketsMax
      }
    });
    this.fireworks.start();
  }

  stopFireworks() {
    this.fireworks?.stop();
    document.querySelector(".fireworks-container")?.remove();
    document.querySelectorAll("canvas").forEach(c => c.remove());
    this.fireworks = null;
  }
};

class FireworksSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Global Fireworks Settings" });

    new Setting(containerEl)
      .setName("Enable Fireworks")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async value => {
            this.plugin.settings.enabled = value;
            await this.plugin.saveSettings();
            value
              ? this.plugin.startFireworks()
              : this.plugin.stopFireworks();
          })
      );

    containerEl.createEl("h3", { text: "Core Physics" });

    this.addSlider(containerEl, "Acceleration", "acceleration", 0.9, 1.2, 0.01);
    this.addSlider(containerEl, "Gravity", "gravity", 0, 3, 0.1);
    this.addSlider(containerEl, "Opacity", "opacity", 0.1, 1, 0.05);

    containerEl.createEl("h3", { text: "Visual & Motion" });
    this.addSlider(containerEl, "Intensity", "intensity", 1, 30, 1);
    this.addSlider(containerEl, "Particles", "particles", 10, 150, 5);
    this.addSlider(containerEl, "Flickering", "flickering", 0, 100, 5);
    this.addSlider(containerEl, "Trace Length", "traceLength", 1, 10, 1);
    this.addSlider(containerEl, "Trace Speed", "traceSpeed", 1, 10, 1);

    containerEl.createEl("h3", { text: "Explosion & Light" });
    this.addSlider(containerEl, "Explosion Power", "explosion", 1, 10, 1);
    this.addSlider(containerEl, "Line Width", "lineWidth", 1, 5, 1);
    this.addSlider(containerEl, "Brightness Min", "brightnessMin", 10, 100, 5);
    this.addSlider(containerEl, "Brightness Max", "brightnessMax", 10, 100, 5);

    containerEl.createEl("h3", { text: "Timing & Launch" });
    this.addSlider(containerEl, "Delay Min (ms)", "delayMin", 20, 500, 10);
    this.addSlider(containerEl, "Delay Max (ms)", "delayMax", 50, 1000, 25);
    this.addSlider(containerEl, "Launch Height Min (%)", "rocketsMin", 0, 100, 5);
    this.addSlider(containerEl, "Launch Height Max (%)", "rocketsMax", 0, 100, 5);

    new Setting(containerEl)
      .setName("Reset to Defaults")
      .setDesc("Restore recommended fireworks settings")
      .addButton(btn =>
        btn
          .setButtonText("Reset")
          .setCta()
          .onClick(async () => {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.plugin.stopFireworks();
            this.plugin.startFireworks();
            this.display();
          })
      );
  }

  addSlider(container, label, key, min, max, step) {
    new Setting(container)
      .setName(label)
      .addSlider(slider =>
        slider
          .setLimits(min, max, step)
          .setValue(this.plugin.settings[key])
          .setDynamicTooltip()
          .onChange(async value => {
            this.plugin.settings[key] = value;
            await this.plugin.saveSettings();
            this.plugin.stopFireworks();
            this.plugin.startFireworks();
          })
      );
  }
}