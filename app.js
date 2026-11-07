/* ===========================================================
   FLOWER BLOOM — Real-time Hand Gesture Flower Controller
   ===========================================================
   Uses MediaPipe Hands to track hand gestures and render a
   procedural glowing flower that blooms and grows
   on a Canvas overlay atop the webcam feed.
   =========================================================== */

// =============================================================
// NOISE — Organic movement via layered sine waves
// =============================================================
class OrganicNoise {
    constructor() {
        this.seeds = Array.from({ length: 8 }, () => Math.random() * 1000);
    }

    /** Returns a value roughly in [-1, 1] */
    get(t, channel = 0) {
        const s = this.seeds[channel % this.seeds.length];
        return (
            Math.sin(t * 0.7 + s) * 0.4 +
            Math.sin(t * 1.3 + s * 1.7) * 0.3 +
            Math.sin(t * 2.1 + s * 0.3) * 0.2 +
            Math.sin(t * 3.7 + s * 2.1) * 0.1
        );
    }
}

// =============================================================
// PARTICLE — Floating pollen / sparkle
// =============================================================
class Particle {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.cw;
        this.y = initial ? Math.random() * this.ch : this.ch + Math.random() * 40;
        this.radius = Math.random() * 2.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -(Math.random() * 0.6 + 0.15);
        this.life = Math.random() * 300 + 150;
        this.maxLife = this.life;
        this.hue = 330 + Math.random() * 40;          // pink-ish
        this.brightness = 70 + Math.random() * 20;
        this.flickerPhase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= dt;
        if (this.life <= 0 || this.y < -20 || this.x < -20 || this.x > this.cw + 20) {
            this.reset();
        }
    }

    draw(ctx) {
        const t = this.life / this.maxLife;
        const flicker = 0.5 + 0.5 * Math.sin(this.life * 0.08 + this.flickerPhase);
        const alpha = t * 0.75 * flicker;
        if (alpha < 0.02) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${this.hue}, 100%, ${this.brightness}%, 0.8)`;
        ctx.fillStyle = `hsla(${this.hue}, 90%, ${this.brightness}%, 1)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// A light petal-shaped particle released by an open-palm bloom.
class PetalParticle {
    constructor(cw, ch) {
        this.x = Math.random() * cw;
        this.y = Math.random() * ch;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -1 - Math.random();
        this.life = 110 + Math.random() * 90;
        this.age = 0;
        this.size = 3 + Math.random() * 5;
        this.rotation = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.08;
        this.hue = [335, 18, 270, 38][Math.floor(Math.random() * 4)];
    }
    update(dt) {
        this.age += dt;
        this.x += this.vx;
        this.y += this.vy + Math.sin(this.age * 0.06) * 0.35;
        this.vy += 0.012 * dt;
        this.rotation += this.spin * dt;
    }
    draw(ctx) {
        const alpha = Math.max(0, 1 - this.age / this.life);
        if (!alpha) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = `hsla(${this.hue}, 72%, 82%, .9)`;
        ctx.beginPath(); ctx.ellipse(0, 0, this.size * .62, this.size * 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

// =============================================================
// FIREFLY — Warm blinking "jugnu" drifting lazily through the scene
// =============================================================
class Firefly {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = true) {
        this.x = Math.random() * this.cw;
        this.y = Math.random() * this.ch;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderSpeed = 0.2 + Math.random() * 0.35;
        this.radius = Math.random() * 1.8 + 1.3;
        this.blinkPhase = Math.random() * Math.PI * 2;
        this.blinkSpeed = 0.015 + Math.random() * 0.025;
        this.hue = 45 + Math.random() * 15; // warm gold
    }

    update(dt) {
        // Lazy wandering rather than a straight drift
        this.wanderAngle += (Math.random() - 0.5) * 0.15 * dt;
        this.x += Math.cos(this.wanderAngle) * this.wanderSpeed * dt;
        this.y += Math.sin(this.wanderAngle) * this.wanderSpeed * dt * 0.6;
        this.blinkPhase += this.blinkSpeed * dt;

        // Wrap softly around the edges instead of resetting
        if (this.x < -20) this.x = this.cw + 20;
        if (this.x > this.cw + 20) this.x = -20;
        if (this.y < -20) this.y = this.ch + 20;
        if (this.y > this.ch + 20) this.y = -20;
    }

    draw(ctx) {
        const blink = Math.pow(0.5 + 0.5 * Math.sin(this.blinkPhase), 2.5);
        const alpha = 0.12 + blink * 0.85;
        if (alpha < 0.05) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 14 + blink * 10;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, 0.9)`;
        ctx.fillStyle = `hsla(${this.hue}, 100%, ${75 + blink * 10}%, 1)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// =============================================================
// HEART — Romantic floating heart particle
// =============================================================
class HeartParticle {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.cw;
        // Start below the frame (unless it's the very first spawn, then scatter across screen)
        this.y = initial ? Math.random() * this.ch : this.ch + Math.random() * 60;
        this.size = Math.random() * 10 + 6;           // heart render size in px
        this.vx = (Math.random() - 0.5) * 0.25;        // gentle horizontal drift
        this.vy = -(Math.random() * 0.45 + 0.1);       // slow upward float
        this.life = Math.random() * 400 + 250;
        this.maxLife = this.life;
        this.hue = 340 + Math.random() * 25;           // rosy red/pink range
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.01 + Math.random() * 0.02;
        this.spinPhase = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 0.01; // slow lazy rotation, either direction
    }

    update(dt) {
        this.wobblePhase += this.wobbleSpeed * dt;
        // Sideways wobble keeps hearts from floating in a straight line.
        const wobble = Math.sin(this.wobblePhase) * 0.4;
        this.x += this.vx + wobble;
        this.y += this.vy;
        this.spinPhase += this.spinSpeed * dt;
        this.life -= dt;
        if (this.life <= 0 || this.y < -30 || this.x < -30 || this.x > this.cw + 30) {
            this.reset();
        }
    }

    draw(ctx) {
        const t = this.life / this.maxLife;
        // Fade in near spawn, fade out near end of life, for a soft appear/disappear
        const fade = Math.min(1, (1 - t) * 6, t * 3);
        const alpha = fade * 0.8;
        if (alpha < 0.02) return;

        const s = this.size;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.spinPhase);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 70%, 0.9)`;
        ctx.fillStyle = `hsla(${this.hue}, 90%, ${65 + 10 * Math.sin(this.wobblePhase)}%, 1)`;

        // Classic two-lobe heart shape drawn with bezier curves, centered on (0,0)
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s * 0.9);
        ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// =============================================================
// GOLDEN SPARKLE — dust-mote sparkle effect inspired by the
// "shiny golden sparkle dust on dark background" reference image.
// Three flavors live in this one class: plain drifting dust,
// bigger bright "flare" sparkles, and tightly-packed diagonal
// "stream" clusters (set via the constructor args below).
// =============================================================
class GoldenSparkle {
    // cw/ch = current canvas width/height, needed to place + wrap particles
    // isFlare = true makes this a bigger, brighter "hero" sparkle instead of tiny dust
    // streamPos = optional {x, y} to force-spawn this sparkle at a specific point
    //             (used only when building a stream cluster instead of a random dot)
    constructor(cw, ch, isFlare = false, streamPos = null) {
        this.cw = cw; // store canvas width so update()/wrap logic can reference it later
        this.ch = ch; // store canvas height for the same reason
        this.isFlare = isFlare; // remember which "flavor" of sparkle this is
        this.reset(true, streamPos); // set all starting values (position, size, speed, glow)
    }

    // (Re)initializes this sparkle's state. Called once on creation, and again
    // whenever a sparkle needs to respawn elsewhere after finishing its life.
    // initial = true only on first construction, so timers start pre-warmed.
    // streamPos, if provided, pins the starting x/y instead of picking randomly.
    reset(initial = false, streamPos = null) {
        if (streamPos) {
            // Stream sparkles start at a precise point along their cluster's line
            this.x = streamPos.x;
            this.y = streamPos.y;
        } else {
            // Regular/flare sparkles start anywhere at random across the canvas
            this.x = Math.random() * this.cw;
            this.y = Math.random() * this.ch;
        }

        // Pick a radius depending on whether this is tiny dust or a bold flare dot
        this.radius = this.isFlare
            ? Math.random() * 2.2 + 2.4   // flares: roughly 2.4–4.6 px, reads as a bold glowing dot
            : Math.random() * 1.5 + 0.5;  // dust: roughly 0.5–2.0 px, tiny sparkle specks

        // Slow independent drift so sparkles float gently rather than all moving in lockstep.
        // Stream sparkles drift much slower so the cluster shape holds together longer.
        const driftScale = streamPos ? 0.08 : 0.22;
        this.vx = (Math.random() - 0.5) * driftScale; // small random horizontal drift
        this.vy = (Math.random() - 0.5) * driftScale; // small random vertical drift

        // Twinkle state: a sine wave pushes brightness up and down over time
        this.twinklePhase = Math.random() * Math.PI * 2; // random starting point in the pulse cycle
        this.twinkleSpeed = 0.02 + Math.random() * 0.05;  // how fast this sparkle pulses brighter/dimmer

        // Warm gold hue range so sparkles vary slightly instead of being one flat color
        this.hue = 42 + Math.random() * 14; // roughly amber-gold to warm yellow

        // Base opacity ceiling — flares are allowed to shine brighter than plain dust
        this.baseAlpha = this.isFlare ? 0.75 + Math.random() * 0.25 : 0.3 + Math.random() * 0.4;
    }

    // Advances this sparkle by one animation frame.
    update(dt) {
        this.x += this.vx;                    // drift horizontally at its own slow pace
        this.y += this.vy;                    // drift vertically at its own slow pace
        this.twinklePhase += this.twinkleSpeed * dt; // advance the brightness pulse over time

        // Softly wrap around screen edges instead of hard-resetting, so sparkles
        // never visibly "pop" back into view — matches the Firefly wrap style above
        const margin = 20; // buffer distance so wrapping happens just off-screen
        if (this.x < -margin) this.x = this.cw + margin;
        if (this.x > this.cw + margin) this.x = -margin;
        if (this.y < -margin) this.y = this.ch + margin;
        if (this.y > this.ch + margin) this.y = -margin;
    }

    // Renders this sparkle onto the canvas for the current frame
    draw(ctx) {
        // Map the sine wave from [-1, 1] into [0, 1] so it oscillates between dim and bright
        const twinkle = (Math.sin(this.twinklePhase) + 1) / 2;
        // Final alpha blends the base brightness with the twinkle pulse, keeping a soft floor
        // (0.35 + twinkle * 0.65) so sparkles never fully vanish, just dim and re-brighten
        const alpha = this.baseAlpha * (0.35 + twinkle * 0.65);
        if (alpha < 0.02) return; // skip drawing nearly-invisible sparkles, saves a little work

        ctx.save(); // isolate the glow/shadow settings below so they don't leak to later draws
        // Flares get a bigger halo than plain dust, matching the bold glowing dots in the reference image
        ctx.shadowBlur = this.isFlare ? 16 : 6;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 65%, ${alpha})`; // glow color matches the dot's hue
        ctx.globalAlpha = alpha; // apply the computed fade/twinkle opacity to the fill below
        ctx.fillStyle = `hsla(${this.hue}, 95%, ${this.isFlare ? 70 : 60}%, 1)`; // warm gold fill color
        ctx.beginPath(); // start a fresh path for this dot
        // Flares visibly "breathe" in size with the twinkle; dust stays a constant tiny size
        const drawRadius = this.isFlare ? this.radius * (0.8 + twinkle * 0.4) : this.radius;
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2); // draw a full circle at this sparkle's position
        ctx.fill(); // paint the circle using fillStyle above
        ctx.restore(); // restore canvas state, clearing the shadow settings for whatever draws next
    }
}

// =============================================================
// GRASS — Embedded ground-cover artwork (drawn tiled along the base)
// =============================================================
const GRASS_SVG_BASE64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB3aWR0aD0iMjg1LjQ4NDc0IgogICBoZWlnaHQ9IjQ5LjQ2NjA5OSIKICAgaWQ9InN2ZzExOTgxIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlua3NjYXBlOnZlcnNpb249IjAuNDcgcjIyNTgzIgogICBzb2RpcG9kaTpkb2NuYW1lPSJOZXcgZG9jdW1lbnQgNjIiPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMxMTk4MyI+CiAgICA8aW5rc2NhcGU6cGVyc3BlY3RpdmUKICAgICAgIHNvZGlwb2RpOnR5cGU9Imlua3NjYXBlOnBlcnNwM2QiCiAgICAgICBpbmtzY2FwZTp2cF94PSIwIDogNTI2LjE4MTA5IDogMSIKICAgICAgIGlua3NjYXBlOnZwX3k9IjAgOiAxMDAwIDogMCIKICAgICAgIGlua3NjYXBlOnZwX3o9Ijc0NC4wOTQ0OCA6IDUyNi4xODEwOSA6IDEiCiAgICAgICBpbmtzY2FwZTpwZXJzcDNkLW9yaWdpbj0iMzcyLjA0NzI0IDogMzUwLjc4NzM5IDogMSIKICAgICAgIGlkPSJwZXJzcGVjdGl2ZTExOTg5IiAvPgogICAgPGlua3NjYXBlOnBlcnNwZWN0aXZlCiAgICAgICBpZD0icGVyc3BlY3RpdmUxMTg2MCIKICAgICAgIGlua3NjYXBlOnBlcnNwM2Qtb3JpZ2luPSIwLjUgOiAwLjMzMzMzMzMzIDogMSIKICAgICAgIGlua3NjYXBlOnZwX3o9IjEgOiAwLjUgOiAxIgogICAgICAgaW5rc2NhcGU6dnBfeT0iMCA6IDEwMDAgOiAwIgogICAgICAgaW5rc2NhcGU6dnBfeD0iMCA6IDAuNSA6IDEiCiAgICAgICBzb2RpcG9kaTp0eXBlPSJpbmtzY2FwZTpwZXJzcDNkIiAvPgogIDwvZGVmcz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9ImJhc2UiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6em9vbT0iMC4zNSIKICAgICBpbmtzY2FwZTpjeD0iLTQyNy45NzE5MSIKICAgICBpbmtzY2FwZTpjeT0iLTI2LjY5NTUyMiIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEwMjQiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iNTc1IgogICAgIGlua3NjYXBlOndpbmRvdy14PSItNSIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMyIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIiAvPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTExOTg2Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT48L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZwogICAgIGlua3NjYXBlOmxhYmVsPSJMYXllciAxIgogICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiCiAgICAgaWQ9ImxheWVyMSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtODAyLjk3MTkxLC00NTYuMjAwNTYpIj4KICAgIDxnCiAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1NTUuNzM4MjQsMjMuMDQwOTYxKSIKICAgICAgIGlkPSJnMzExNCIKICAgICAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0iL2hvbWUvc2FyYWgvcGxhdG9uaWtvL3BsYXRvbmlrby9tZWRpYS9pbWcvZ3Jhc3MucG5nIgogICAgICAgaW5rc2NhcGU6ZXhwb3J0LXhkcGk9IjkwLjA0NDY0NyIKICAgICAgIGlua3NjYXBlOmV4cG9ydC15ZHBpPSI5MC4wNDQ2NDciPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQyOTMiCiAgICAgICAgIGQ9Im0gMjYzLjYwNjY2LDQ4Mi42MjU3IDcuMDMxMDksMCBjIC0xLjM3MjgsLTE0LjA1MDE4IC03Ljk5MDMxLC0yNy4xNDgzNyAtMTkuMTUwNTcsLTM5LjUyMjEzIC0xLjM1MjczLC0xLjQ5OTggLTIuNzcxMjQsLTIuOTc5NDcgLTQuMjUzNTEsLTQuNDM3MjcgMS4yNTY0NSwxLjUyMTQ1IDIuNDQzNDUsMy4wNTg1OSAzLjU1OTgzLDQuNjA5NDQgOS4yMDk4NCwxMi43OTQxNSAxMy41NDQ4MiwyNS44MjIzMSAxMi44MTMxNiwzOS4zNDk5NiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjc2NzYyIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSAyODkuOTY2NSw0ODIuNjI1NyA3LjAzMTA5LDAgYyAtMS4zNzI4LC0xNC4wNTAxOCAtNy45OTAzMiwtMjcuMTQ4MzcgLTE5LjE1MDU3LC0zOS41MjIxMyAtMS4zNTI3MywtMS40OTk4IC00Ljc1NTMxLC0xLjU2MjI4IC02LjIzNzU5LC0zLjAyMDA4IDEuMjU2NDUsMS41MjE0NiA0LjQyNzUzLDEuNjQxNCA1LjU0MzksMy4xOTIyNSA5LjIwOTg0LDEyLjc5NDE1IDEzLjU0NDgzLDI1LjgyMjMxIDEyLjgxMzE3LDM5LjM0OTk2IHoiCiAgICAgICAgIGlkPSJwYXRoNDM5OSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MjUxIgogICAgICAgICBkPSJtIDI3NS4zMzA1Myw0ODIuNjI1NyA3LjAyMzQzLDAgYyAtMS43MzI2MSwtMTAuOTQ3OTEgLTAuNTA5MTUsLTIyLjEwNjc1IDMuNjgzMiwtMzIuOTc5NzggMi4xNTYyNiwtNS41OTI0MyA1LjA5Mzc2LC0xMS4xMDk5MyA4Ljc4Njk2LC0xNi40ODYzMiAtNC40MjU4Nyw1LjIwMzk5IC04LjE0MzczLDEwLjYxMTI0IC0xMS4xMDE1OSwxNi4xNjA1MyAtNS43NTEwNCwxMC43ODk4NiAtOC42MTIxMSwyMS45Mjc5MyAtOC4zOTIsMzMuMzA1NTcgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MjkzLTciCiAgICAgICAgIGQ9Im0gMzU4LjUyNTE1LDQ4Mi42MjU3IC03LjAzMTA5LDAgYyAxLjM3MjgsLTE0LjA1MDE4IDcuOTkwMzEsLTI3LjE0ODM3IDE5LjE1MDU3LC0zOS41MjIxMyAxLjM1MjczLC0xLjQ5OTggMi43NzEyNCwtMi45Nzk0NyA0LjI1MzUxLC00LjQzNzI3IC0xLjI1NjQ1LDEuNTIxNDUgLTIuNDQzNDUsMy4wNTg1OSAtMy41NTk4Miw0LjYwOTQ0IC05LjIwOTg1LDEyLjc5NDE1IC0xMy41NDQ4MywyNS44MjIzMSAtMTIuODEzMTcsMzkuMzQ5OTYgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY3Njc2MiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzU5LjQwMzk1LDQ4Mi42MjU3IC03LjAzMTA4LDAgYyAxLjM3Mjc5LC0xNC4wNTAxOCA3Ljk5MDMxLC0yNy4xNDgzNyAxOS4xNTA1NiwtMzkuNTIyMTMgMS4zNTI3MywtMS40OTk4IDQuNzU1MzEsLTEuNTYyMjggNi4yMzc1OSwtMy4wMjAwOCAtMS4yNTY0NSwxLjUyMTQ2IC00LjQyNzUzLDEuNjQxNCAtNS41NDM5LDMuMTkyMjUgLTkuMjA5ODQsMTIuNzk0MTUgLTEzLjU0NDgyLDI1LjgyMjMxIC0xMi44MTMxNywzOS4zNDk5NiB6IgogICAgICAgICBpZD0icGF0aDQzOTktMyIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MjUxLTIiCiAgICAgICAgIGQ9Im0gMzE4LjY4MjM1LDQ4Mi42MjU3IC03LjAyMzQzLDAgYyAxLjczMjYxLC0xMC45NDc5MSAwLjUwOTE1LC0yMi4xMDY3NSAtMy42ODMyLC0zMi45Nzk3OCAtMi4xNTYyNiwtNS41OTI0MyAtNS4wOTM3NiwtMTEuMTA5OTMgLTguNzg2OTUsLTE2LjQ4NjMyIDQuNDI1ODYsNS4yMDM5OSA4LjE0MzcyLDEwLjYxMTI0IDExLjEwMTU4LDE2LjE2MDUzIDUuNzUxMDQsMTAuNzg5ODYgOC42MTIxMiwyMS45Mjc5MyA4LjM5MiwzMy4zMDU1NyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDM1NC43NzExLDQ4Mi42MjU3IDcuMDMxMDgsMCBjIC0xLjM3Mjc5LC0xNC4wNTAxOCAtNy45OTAzMSwtMjcuMTQ4MzcgLTE5LjE1MDU2LC0zOS41MjIxMyAtMS4zNTI3NCwtMS40OTk4IC0yLjc3MTI0LC0yLjk3OTQ3IC00LjI1MzUyLC00LjQzNzI3IDEuMjU2NDUsMS41MjE0NSAyLjQ0MzQ1LDMuMDU4NTkgMy41NTk4Myw0LjYwOTQzIDkuMjA5ODQsMTIuNzk0MTYgMTMuNTQ0ODIsMjUuODIyMzEgMTIuODEzMTcsMzkuMzQ5OTYgeiIKICAgICAgICAgaWQ9InBhdGg0NDY0IiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ0NjYiCiAgICAgICAgIGQ9Im0gMzMzLjg0MjQyLDQ4Mi42MjU3IDcuMDMxMDksMCBjIC0xLjM3MjgsLTE0LjA1MDE4IC03Ljk5MDMxLC0yNy4xNDgzNyAtMTkuMTUwNTcsLTM5LjUyMjEzIC0xLjM1MjczLC0xLjQ5OTggLTQuNzU1MzEsLTEuNTYyMjggLTYuMjM3NTgsLTMuMDIwMDggMS4yNTY0NSwxLjUyMTQ2IDQuNDI3NTIsMS42NDE0IDUuNTQzOSwzLjE5MjI1IDkuMjA5ODQsMTIuNzk0MTUgMTMuNTQ0ODIsMjUuODIyMzEgMTIuODEzMTYsMzkuMzQ5OTYgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY3Njc2MiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzgyLjQ1NzQsNDgyLjYyNTcgNy4wMjM0MywwIGMgLTEuNzMyNjIsLTEwLjk0NzkxIC0wLjUwOTE1LC0yMi4xMDY3NSAzLjY4MzE5LC0zMi45Nzk3OCAyLjE1NjI3LC01LjU5MjQzIDUuMDkzNzcsLTExLjEwOTkzIDguNzg2OTYsLTE2LjQ4NjMyIC00LjQyNTg2LDUuMjAzOTkgLTguMTQzNzIsMTAuNjExMjQgLTExLjEwMTU4LDE2LjE2MDUzIC01Ljc1MTA0LDEwLjc4OTg2IC04LjYxMjEyLDIxLjkyNzkzIC04LjM5MiwzMy4zMDU1NyB6IgogICAgICAgICBpZD0icGF0aDQ0NjgiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDQ5MiIKICAgICAgICAgZD0ibSAzMjEuMTA4MTYsNDgyLjYyNTcgLTcuMDMxMDksMCBjIDEuMzcyOCwtMTQuMDUwMTggNy45OTAzMSwtMjcuMTQ4MzcgMTkuMTUwNTcsLTM5LjUyMjEzIDEuMzUyNzMsLTEuNDk5OCAyLjc3MTI0LC0yLjk3OTQ3IDQuMjUzNTEsLTQuNDM3MjcgLTEuMjU2NDUsMS41MjE0NSAtMi40NDM0NSwzLjA1ODU5IC0zLjU1OTgyLDQuNjA5NDQgLTkuMjA5ODUsMTIuNzk0MTUgLTEzLjU0NDgzLDI1LjgyMjMxIC0xMi44MTMxNywzOS4zNDk5NiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjc2NzYyIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSAzMTAuNzYxODYsNDgyLjYyNTcgLTcuMDMxMDgsMCBjIDEuMzcyNzksLTE0LjA1MDE4IDcuOTkwMzEsLTI3LjE0ODM3IDE5LjE1MDU2LC0zOS41MjIxMyAxLjM1Mjc0LC0xLjQ5OTggNC43NTUzMiwtMS41NjIyOCA2LjIzNzU5LC0zLjAyMDA4IC0xLjI1NjQ1LDEuNTIxNDYgLTQuNDI3NTMsMS42NDE0IC01LjU0MzksMy4xOTIyNSAtOS4yMDk4NCwxMi43OTQxNSAtMTMuNTQ0ODIsMjUuODIyMzEgLTEyLjgxMzE3LDM5LjM0OTk2IHoiCiAgICAgICAgIGlkPSJwYXRoNDQ5NCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NDk2IgogICAgICAgICBkPSJtIDM0Ny41NTQ3Nyw0ODIuNjI1NyAtNy4wMjM0NCwwIGMgMS43MzI2MiwtMTAuOTQ3OTEgMC41MDkxNiwtMjIuMTA2NzUgLTMuNjgzMTksLTMyLjk3OTc4IC0yLjE1NjI2LC01LjU5MjQzIC01LjA5Mzc2LC0xMS4xMDk5MyAtOC43ODY5NiwtMTYuNDg2MzIgNC40MjU4Nyw1LjIwMzk5IDguMTQzNzIsMTAuNjExMjQgMTEuMTAxNTksMTYuMTYwNTMgNS43NTEwNCwxMC43ODk4NiA4LjYxMjExLDIxLjkyNzkzIDguMzkyLDMzLjMwNTU3IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDI5My0yIgogICAgICAgICBkPSJtIDQ0MC43ODUyOCw0ODIuNjI1NyA3LjAzMTA4LDAgYyAtMS4zNzI3OSwtMTQuMDUwMTggLTcuOTkwMzEsLTI3LjE0ODM3IC0xOS4xNTA1NiwtMzkuNTIyMTMgLTEuMzUyNzMsLTEuNDk5OCAtMi43NzEyNCwtMi45Nzk0NyAtNC4yNTM1MiwtNC40MzcyNyAxLjI1NjQ1LDEuNTIxNDUgMi40NDM0NiwzLjA1ODU5IDMuNTU5ODMsNC42MDk0NCA5LjIwOTg0LDEyLjc5NDE1IDEzLjU0NDgzLDI1LjgyMjMxIDEyLjgxMzE3LDM5LjM0OTk2IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NzY3NjIgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDQxNy45NTIzMiw0ODIuNjI1NyA3LjAzMTA5LDAgYyAtMS4zNzI4LC0xNC4wNTAxOCAtNy45OTAzMSwtMjcuMTQ4MzcgLTE5LjE1MDU3LC0zOS41MjIxMyAtMS4zNTI3MywtMS40OTk4IC00Ljc1NTMxLC0xLjU2MjI4IC02LjIzNzU4LC0zLjAyMDA4IDEuMjU2NDUsMS41MjE0NiA0LjQyNzUyLDEuNjQxNCA1LjU0MzksMy4xOTIyNSA5LjIwOTg0LDEyLjc5NDE1IDEzLjU0NDgyLDI1LjgyMjMxIDEyLjgxMzE2LDM5LjM0OTk2IHoiCiAgICAgICAgIGlkPSJwYXRoNDM5OS01IiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQyNTEtMSIKICAgICAgICAgZD0ibSA0OTAuNzAwOTEsNDgyLjYyNTcgNy4wMjM0MywwIGMgLTEuNzMyNjIsLTEwLjk0NzkxIC0wLjUwOTE1LC0yMi4xMDY3NSAzLjY4MzE5LC0zMi45Nzk3OCAyLjE1NjI3LC01LjU5MjQzIDUuMDkzNzcsLTExLjEwOTkzIDguNzg2OTYsLTE2LjQ4NjMyIC00LjQyNTg2LDUuMjAzOTkgLTguMTQzNzIsMTAuNjExMjQgLTExLjEwMTU4LDE2LjE2MDUzIC01Ljc1MTA0LDEwLjc4OTg2IC04LjYxMjEyLDIxLjkyNzkzIC04LjM5MiwzMy4zMDU1NyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQyOTMtNy0xIgogICAgICAgICBkPSJtIDQ2Mi40MTU4Myw0ODIuNjI1NyAtNy4wMzEwOCwwIGMgMS4zNzI3OSwtMTQuMDUwMTggNy45OTAzMSwtMjcuMTQ4MzcgMTkuMTUwNTYsLTM5LjUyMjEzIDEuMzUyNzMsLTEuNDk5OCAyLjc3MTI0LC0yLjk3OTQ3IDQuMjUzNTIsLTQuNDM3MjcgLTEuMjU2NDUsMS41MjE0NSAtMi40NDM0NiwzLjA1ODU5IC0zLjU1OTgzLDQuNjA5NDQgLTkuMjA5ODQsMTIuNzk0MTUgLTEzLjU0NDgyLDI1LjgyMjMxIC0xMi44MTMxNywzOS4zNDk5NiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjc2NzYyIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSA0NzMuMzM2Myw0ODIuNjI1NyAtNy4wMzEwOSwwIGMgMS4zNzI4LC0xNC4wNTAxOCA3Ljk5MDMxLC0yNy4xNDgzNyAxOS4xNTA1NywtMzkuNTIyMTMgMS4zNTI3MywtMS40OTk4IDQuNzU1MzEsLTEuNTYyMjggNi4yMzc1OCwtMy4wMjAwOCAtMS4yNTY0NSwxLjUyMTQ2IC00LjQyNzUyLDEuNjQxNCAtNS41NDM4OSwzLjE5MjI1IC05LjIwOTg1LDEyLjc5NDE1IC0xMy41NDQ4MywyNS44MjIzMSAtMTIuODEzMTcsMzkuMzQ5OTYgeiIKICAgICAgICAgaWQ9InBhdGg0Mzk5LTMtMSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MjUxLTItMCIKICAgICAgICAgZD0ibSA0NjIuNTMyNjksNDgyLjYyNTcgLTcuMDIzNDMsMCBjIDEuNzMyNjEsLTEwLjk0NzkxIDAuNTA5MTUsLTIyLjEwNjc1IC0zLjY4MzIsLTMyLjk3OTc4IC0yLjE1NjI2LC01LjU5MjQzIC01LjA5Mzc2LC0xMS4xMDk5MyAtOC43ODY5NiwtMTYuNDg2MzIgNC40MjU4Nyw1LjIwMzk5IDguMTQzNzMsMTAuNjExMjQgMTEuMTAxNTksMTYuMTYwNTMgNS43NTEwNCwxMC43ODk4NiA4LjYxMjExLDIxLjkyNzkzIDguMzkyLDMzLjMwNTU3IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNTE5LjQwNzcyLDQ4Mi42MjU3IDcuMDMxMDksMCBjIC0xLjM3MjgsLTE0LjA1MDE4IC03Ljk5MDMxLC0yNy4xNDgzNyAtMTkuMTUwNTcsLTM5LjUyMjEzIC0xLjM1MjczLC0xLjQ5OTggLTIuNzcxMjQsLTIuOTc5NDcgLTQuMjUzNTEsLTQuNDM3MjcgMS4yNTY0NSwxLjUyMTQ1IDIuNDQzNDUsMy4wNTg1OSAzLjU1OTgzLDQuNjA5NDMgOS4yMDk4NCwxMi43OTQxNiAxMy41NDQ4MiwyNS44MjIzMSAxMi44MTMxNiwzOS4zNDk5NiB6IgogICAgICAgICBpZD0icGF0aDQ0NjQtNyIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NDY2LTciCiAgICAgICAgIGQ9Im0gNDgwLjEwNDEyLDQ4Mi42MjU3IDcuMDMxMDgsMCBjIC0xLjM3Mjc5LC0xNC4wNTAxOCAtNy45OTAzMSwtMjcuMTQ4MzcgLTE5LjE1MDU2LC0zOS41MjIxMyAtMS4zNTI3NCwtMS40OTk4IC00Ljc1NTMyLC0xLjU2MjI4IC02LjIzNzU5LC0zLjAyMDA4IDEuMjU2NDUsMS41MjE0NiA0LjQyNzUzLDEuNjQxNCA1LjU0MzksMy4xOTIyNSA5LjIwOTg0LDEyLjc5NDE1IDEzLjU0NDgyLDI1LjgyMjMxIDEyLjgxMzE3LDM5LjM0OTk2IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyMjU1MDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NzY3NjIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDQ1Mi41ODA5MSw0ODIuNjI1NyA3LjAyMzQ0LDAgYyAtMS43MzI2MiwtMTAuOTQ3OTEgLTAuNTA5MTUsLTIyLjEwNjc1IDMuNjgzMTksLTMyLjk3OTc4IDIuMTU2MjcsLTUuNTkyNDMgNS4wOTM3NywtMTEuMTA5OTMgOC43ODY5NiwtMTYuNDg2MzIgLTQuNDI1ODYsNS4yMDM5OSAtOC4xNDM3MiwxMC42MTEyNCAtMTEuMTAxNTgsMTYuMTYwNTMgLTUuNzUxMDUsMTAuNzg5ODYgLTguNjEyMTIsMjEuOTI3OTMgLTguMzkyMDEsMzMuMzA1NTcgeiIKICAgICAgICAgaWQ9InBhdGg0NDY4LTgiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDQ5Mi04IgogICAgICAgICBkPSJtIDQxNy4xNDgzNyw0ODIuNjI1NyAtNy4wMzEwOCwwIGMgMS4zNzI3OSwtMTQuMDUwMTggNy45OTAzMSwtMjcuMTQ4MzcgMTkuMTUwNTYsLTM5LjUyMjEzIDEuMzUyNzMsLTEuNDk5OCAyLjc3MTI0LC0yLjk3OTQ3IDQuMjUzNTIsLTQuNDM3MjcgLTEuMjU2NDUsMS41MjE0NSAtMi40NDM0NiwzLjA1ODU5IC0zLjU1OTgzLDQuNjA5NDQgLTkuMjA5ODQsMTIuNzk0MTUgLTEzLjU0NDgzLDI1LjgyMjMxIC0xMi44MTMxNywzOS4zNDk5NiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojMjI1NTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjc2NzYyIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSA0NzkuNTM2MjUsNDgyLjYyNTcgLTcuMDMxMDksMCBjIDEuMzcyOCwtMTQuMDUwMTggNy45OTAzMSwtMjcuMTQ4MzcgMTkuMTUwNTcsLTM5LjUyMjEzIDEuMzUyNzMsLTEuNDk5OCA0Ljc1NTMxLC0xLjU2MjI4IDYuMjM3NTgsLTMuMDIwMDggLTEuMjU2NDUsMS41MjE0NiAtNC40Mjc1MiwxLjY0MTQgLTUuNTQzOSwzLjE5MjI1IC05LjIwOTg0LDEyLjc5NDE1IC0xMy41NDQ4MiwyNS44MjIzMSAtMTIuODEzMTYsMzkuMzQ5OTYgeiIKICAgICAgICAgaWQ9InBhdGg0NDk0LTQiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDQ5Ni05IgogICAgICAgICBkPSJtIDUxNC45NDc2OSw0ODIuNjI1NyAtNy4wMjM0NCwwIGMgMS43MzI2MiwtMTAuOTQ3OTEgMC41MDkxNiwtMjIuMTA2NzUgLTMuNjgzMTksLTMyLjk3OTc4IC0yLjE1NjI2LC01LjU5MjQzIC01LjA5Mzc3LC0xMS4xMDk5MyAtOC43ODY5NiwtMTYuNDg2MzIgNC40MjU4Nyw1LjIwMzk5IDguMTQzNzIsMTAuNjExMjQgMTEuMTAxNTgsMTYuMTYwNTMgNS43NTEwNSwxMC43ODk4NiA4LjYxMjEyLDIxLjkyNzkzIDguMzkyMDEsMzMuMzA1NTcgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzIyNTUwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgIDwvZz4KICAgIDxnCiAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1NTUuNzM4MjQsMjMuMDQwOTYxKSIKICAgICAgIGlkPSJnMzA4NyIKICAgICAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0iL2hvbWUvc2FyYWgvcGxhdG9uaWtvL3BsYXRvbmlrby9tZWRpYS9pbWcvZ3Jhc3MucG5nIgogICAgICAgaW5rc2NhcGU6ZXhwb3J0LXhkcGk9IjkwLjA0NDY0NyIKICAgICAgIGlua3NjYXBlOmV4cG9ydC15ZHBpPSI5MC4wNDQ2NDciPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDUiCiAgICAgICAgIGQ9Im0gMjU0LjMwNzE5LDQ4Mi42MjU3IC00LjcyMDc5LDAgYyAwLjM3OTcsLTcuMjU4MDkgMy43ODM4NSwtMTQuMDE1NTEgOS43MzY2LC0yMC4yNzg0MyAzLjc1MDQsLTMuOTQ1MjcgOC40OTgyNCwtNy41NTY5MyAxNC4wMjE3NCwtMTAuNzAwOSAtNC44MzkwNywzLjQ3MjY3IC04LjczMTU1LDcuMzAzNzcgLTExLjU0OTI1LDExLjMyNTkxIC00LjQ3MTc2LDYuMzgyNTMgLTguNTIwMzgsMTMuMDE1NDcgLTcuNDg4MywxOS42NTM0MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQyOTciCiAgICAgICAgIGQ9Im0gMjc0Ljk3MjA4LDQ4Mi42MjU3IDcuMDMwMDQsMCBjIC0xLjA4ODAzLC04LjgzNzUzIC00LjM1ODU3LC0xNy40MDI3NiAtOS41NjQ1NiwtMjUuMzkzODUgLTIuNDMxNTksLTMuNzMyMzQgLTUuMjgyMTcsLTcuMzI1ODkgLTguNTExNzIsLTEwLjc0MjMgMi41NzMxMiwzLjY1MDEzIDQuNzEzNTgsNy40MTIwMSA2LjQwNDY4LDExLjI0MDQ2IDMuNjIwMzEsOC4xOTU3OCA1LjE2Nzg3LDE2LjUzODU2IDQuNjQxNTYsMjQuODk1NjkgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ0YWEwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0Mjk5IgogICAgICAgICBkPSJtIDI4OS43MzUsNDgyLjYyNTcgNS4yNTIyNSwwIGMgLTAuNDkxNDQsLTMuNzY2MTMgLTEuNTM0NzIsLTYuODc0OTQgLTMuNzc0MDEsLTEwLjM5ODg1IC0yLjg0OTEyLC00LjQ1NzkyIC01LjQ2MDE0LC04LjY3MTEzIC04Ljc5MTE3LC0xMi43ODQwNCAwLDAgMCwwIDAsMCAtMy4zMDE5NywtNC4xMTQ5IC02LjAyMzk0LC04LjQzNTM2IC01Ljk0MTE3LC0xMi45MTU2OCAwLjA0MjYsLTIuNzU1NjcgMS4xNTQxMywtNS41MzIzNyAzLjI3MjMxLC04LjA4MTM2IC0yLjQ5NTE0LDIuNDQyMTUgLTQuMDY1ODYsNS4yMDE0NSAtNC41NDEwNiw4LjA0NTM5IC0wLjc1OTAzLDQuNjIxNjkgMS4zMjMxOCw5LjI4Mjk1IDQuMTExMjQsMTMuNjM1MSAwLDAgMCwwIDAsMCAyLjc1OTM0LDQuMzU0NjEgNi4xNjM1Nyw4LjUyNzUxIDguMTQ4MDMsMTIuNzgyMTYgMCwwIDAsMCAwLDAgMS41Nzg0MSwzLjM1NzUgMi4zMzYwNSw2LjI4ODMxIDIuMjYzNTgsOS43MTcyOCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDUtMSIKICAgICAgICAgZD0ibSAzMTMuMDA4MTgsNDgyLjYyNTcgLTQuNzIwNzksMCBjIDAuMzc5NywtNy4yNTgwOSAzLjc4Mzg1LC0xNC4wMTU1MSA5LjczNjYsLTIwLjI3ODQzIDMuNzUwNCwtMy45NDUyNyA4LjQ5ODI0LC03LjU1NjkzIDE0LjAyMTc1LC0xMC43MDA5IC00LjgzOTA4LDMuNDcyNjcgLTguNzMxNTYsNy4zMDM3NyAtMTEuNTQ5MjYsMTEuMzI1OTEgLTQuNDcxNzYsNi4zODI1MyAtOC41MjAzOCwxMy4wMTU0NyAtNy40ODgzLDE5LjY1MzQyIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDI5Ny0wIgogICAgICAgICBkPSJtIDM3NC4yODM5Myw0ODIuNjI1NyAtNy4wMzAwMywwIGMgMS4wODgwMywtOC44Mzc1NCA0LjM1ODU3LC0xNy40MDI3NiA5LjU2NDU1LC0yNS4zOTM4NSAyLjQzMTYsLTMuNzMyMzQgNS4yODIxNywtNy4zMjU4OSA4LjUxMTczLC0xMC43NDIzIC0yLjU3MzEyLDMuNjUwMTMgLTQuNzEzNTgsNy40MTIwMSAtNi40MDQ2OSwxMS4yNDA0NiAtMy42MjAzMSw4LjE5NTc4IC01LjE2Nzg3LDE2LjUzODU2IC00LjY0MTU2LDI0Ljg5NTY5IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDI5OS02IgogICAgICAgICBkPSJtIDM0My41MTUxOSw0ODIuNjI1NjkgLTUuMjUyMjQsMCBjIDAuNDkxNDMsLTMuNzY2MTMgMS41MzQ3MSwtNi44NzQ5MyAzLjc3NCwtMTAuMzk4ODQgMi44NDkxMywtNC40NTc5MiA1LjQ2MDE1LC04LjY3MTEzIDguNzkxMTcsLTEyLjc4NDA0IDAsMCAwLDAgMCwwIDMuMzAxOTcsLTQuMTE0OSA2LjAyMzk1LC04LjQzNTM2IDUuOTQxMTcsLTEyLjkxNTY4IC0wLjA0MjcsLTIuNzU1NjcgLTEuMTU0MTMsLTUuNTMyMzcgLTMuMjcyMywtOC4wODEzNiAyLjQ5NTE0LDIuNDQyMTUgNC4wNjU4NSw1LjIwMTQ1IDQuNTQxMDUsOC4wNDUzOSAwLjc1OTA0LDQuNjIxNjkgLTEuMzIzMTcsOS4yODI5NSAtNC4xMTEyMywxMy42MzUxIDAsMCAwLDAgMCwwIC0yLjc1OTM1LDQuMzU0NjEgLTYuMTYzNTcsOC41Mjc1MSAtOC4xNDgwMywxMi43ODIxNiAwLDAgMCwwIDAsMCAtMS41Nzg0MiwzLjM1NzUgLTIuMzM2MDYsNi4yODgzMSAtMi4yNjM1OSw5LjcxNzI4IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzY0Ljc0MTkzLDQ4Mi42MjU3IDQuNzIwNzksMCBjIC0wLjM3OTcsLTcuMjU4MDkgLTMuNzgzODUsLTE0LjAxNTUxIC05LjczNjYxLC0yMC4yNzg0MyAtMy43NTAzOSwtMy45NDUyNyAtOC40OTgyMywtNy41NTY5MyAtMTQuMDIxNzQsLTEwLjcwMDkgNC44MzkwOCwzLjQ3MjY3IDguNzMxNTYsNy4zMDM3NyAxMS41NDkyNSwxMS4zMjU5MSA0LjQ3MTc3LDYuMzgyNTMgOC41MjAzOSwxMy4wMTU0NyA3LjQ4ODMxLDE5LjY1MzQyIHoiCiAgICAgICAgIGlkPSJwYXRoNDQ3MCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ0YWEwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSAzNDguMzY2NTUsNDgyLjYyNTY5IDcuMDMwMDMsMCBjIC0xLjA4ODAzLC04LjgzNzUzIC00LjM1ODU3LC0xNy40MDI3NSAtOS41NjQ1NSwtMjUuMzkzODUgLTIuNDMxNiwtMy43MzIzMyAtNS4yODIxNywtNy4zMjU4OCAtOC41MTE3MiwtMTAuNzQyMjkgMi41NzMxMSwzLjY1MDEyIDQuNzEzNTcsNy40MTIwMSA2LjQwNDY4LDExLjI0MDQ1IDMuNjIwMzEsOC4xOTU3OCA1LjE2Nzg3LDE2LjUzODU3IDQuNjQxNTYsMjQuODk1NyB6IgogICAgICAgICBpZD0icGF0aDQ0NzIiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzA5LjM4ODc5LDQ4Mi42MjU2OSA1LjI1MjI1LDAgYyAtMC40OTE0MywtMy43NjYxMyAtMS41MzQ3MiwtNi44NzQ5MyAtMy43NzQwMSwtMTAuMzk4ODQgLTIuODQ5MTMsLTQuNDU3OTIgLTUuNDYwMTQsLTguNjcxMTMgLTguNzkxMTcsLTEyLjc4NDA0IDAsMCAwLDAgMCwwIC0zLjMwMTk3LC00LjExNDkgLTYuMDIzOTQsLTguNDM1MzYgLTUuOTQxMTcsLTEyLjkxNTY4IDAuMDQyNywtMi43NTU2NyAxLjE1NDEzLC01LjUzMjM3IDMuMjcyMywtOC4wODEzNiAtMi40OTUxNCwyLjQ0MjE1IC00LjA2NTg1LDUuMjAxNDUgLTQuNTQxMDUsOC4wNDUzOSAtMC43NTkwNCw0LjYyMTY5IDEuMzIzMTcsOS4yODI5NSA0LjExMTIzLDEzLjYzNTEgMCwwIDAsMCAwLDAgMi43NTkzNSw0LjM1NDYxIDYuMTYzNTgsOC41Mjc1MSA4LjE0ODAzLDEyLjc4MjE2IDAsMCAwLDAgMCwwIDEuNTc4NDIsMy4zNTc1IDIuMzM2MDYsNi4yODgzMSAyLjI2MzU5LDkuNzE3MjggeiIKICAgICAgICAgaWQ9InBhdGg0NDc4IiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ0OTgiCiAgICAgICAgIGQ9Im0gMzI3Ljk3NDk3LDQ4Mi42MjU3IC00LjcyMDc5LDAgYyAwLjM3OTcsLTcuMjU4MDkgMy43ODM4NSwtMTQuMDE1NTEgOS43MzY2LC0yMC4yNzg0MyAzLjc1MDQsLTMuOTQ1MjcgOC40OTgyNCwtNy41NTY5MyAxNC4wMjE3NCwtMTAuNzAwOSAtNC44MzkwNywzLjQ3MjY3IC04LjczMTU1LDcuMzAzNzcgLTExLjU0OTI1LDExLjMyNTkxIC00LjQ3MTc2LDYuMzgyNTMgLTguNTIwMzksMTMuMDE1NDcgLTcuNDg4MywxOS42NTM0MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ1MDAiCiAgICAgICAgIGQ9Im0gMzA0LjI2NjA4LDQ4Mi42MjU2OSAtNy4wMzAwMywwIGMgMS4wODgwMywtOC44Mzc1MyA0LjM1ODU3LC0xNy40MDI3NSA5LjU2NDU1LC0yNS4zOTM4NSAyLjQzMTU5LC0zLjczMjMzIDUuMjgyMTcsLTcuMzI1ODggOC41MTE3MiwtMTAuNzQyMjkgLTIuNTczMTIsMy42NTAxMiAtNC43MTM1OCw3LjQxMjAxIC02LjQwNDY5LDExLjI0MDQ1IC0zLjYyMDMsOC4xOTU3OCAtNS4xNjc4NiwxNi41Mzg1NyAtNC42NDE1NSwyNC44OTU3IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUwNiIKICAgICAgICAgZD0ibSAzNzUuMzE5NjQsNDgyLjYyNTY5IC01LjI1MjI1LDAgYyAwLjQ5MTQzLC0zLjc2NjEzIDEuNTM0NzEsLTYuODc0OTMgMy43NzQwMSwtMTAuMzk4ODQgMi44NDkxMiwtNC40NTc5MiA1LjQ2MDE0LC04LjY3MTEzIDguNzkxMTcsLTEyLjc4NDA0IDAsMCAwLDAgMCwwIDMuMzAxOTcsLTQuMTE0OSA2LjAyMzk0LC04LjQzNTM2IDUuOTQxMTcsLTEyLjkxNTY4IC0wLjA0MjYsLTIuNzU1NjcgLTEuMTU0MTMsLTUuNTMyMzcgLTMuMjcyMywtOC4wODEzNiAyLjQ5NTE0LDIuNDQyMTUgNC4wNjU4NSw1LjIwMTQ1IDQuNTQxMDUsOC4wNDUzOSAwLjc1OTA0LDQuNjIxNjkgLTEuMzIzMTcsOS4yODI5NSAtNC4xMTEyMywxMy42MzUxIDAsMCAwLDAgMCwwIC0yLjc1OTM1LDQuMzU0NjEgLTYuMTYzNTgsOC41Mjc1MSAtOC4xNDgwNCwxMi43ODIxNiAwLDAgMCwwIDAsMCAtMS41Nzg0MiwzLjM1NzUgLTIuMzM2MDYsNi4yODgzMSAtMi4yNjM1OCw5LjcxNzI4IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwNS0xNiIKICAgICAgICAgZD0ibSA0NTIuODAyNjksNDgyLjYyNTcgNC43MjA3OSwwIGMgLTAuMzc5NywtNy4yNTgwOSAtMy43ODM4NSwtMTQuMDE1NTEgLTkuNzM2NjEsLTIwLjI3ODQzIC0zLjc1MDQsLTMuOTQ1MjcgLTguNDk4MjMsLTcuNTU2OTMgLTE0LjAyMTc0LC0xMC43MDA5IDQuODM5MDcsMy40NzI2NyA4LjczMTU2LDcuMzAzNzcgMTEuNTQ5MjUsMTEuMzI1OTEgNC40NzE3Nyw2LjM4MjUzIDguNTIwMzksMTMuMDE1NDcgNy40ODgzMSwxOS42NTM0MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQyOTctMDIiCiAgICAgICAgIGQ9Im0gNDg1Ljc3MjQxLDQ4Mi42MjU3IDcuMDMwMDMsMCBjIC0xLjA4ODAzLC04LjgzNzUzIC00LjM1ODU3LC0xNy40MDI3NiAtOS41NjQ1NSwtMjUuMzkzODUgLTIuNDMxNiwtMy43MzIzNCAtNS4yODIxOCwtNy4zMjU4OSAtOC41MTE3MywtMTAuNzQyMyAyLjU3MzEyLDMuNjUwMTMgNC43MTM1OCw3LjQxMjAxIDYuNDA0NjksMTEuMjQwNDYgMy42MjAzLDguMTk1NzggNS4xNjc4NywxNi41Mzg1NiA0LjY0MTU2LDI0Ljg5NTY5IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDI5OS0zIgogICAgICAgICBkPSJtIDQ5MC44NjA4OSw0ODIuNjI1NyA1LjI1MjI1LDAgYyAtMC40OTE0NCwtMy43NjYxMyAtMS41MzQ3MiwtNi44NzQ5NCAtMy43NzQwMSwtMTAuMzk4ODUgLTIuODQ5MTMsLTQuNDU3OTIgLTUuNDYwMTUsLTguNjcxMTMgLTguNzkxMTcsLTEyLjc4NDA0IDAsMCAwLDAgMCwwIC0zLjMwMTk3LC00LjExNDkgLTYuMDIzOTUsLTguNDM1MzYgLTUuOTQxMTcsLTEyLjkxNTY4IDAuMDQyNywtMi43NTU2NyAxLjE1NDEzLC01LjUzMjM3IDMuMjcyMywtOC4wODEzNiAtMi40OTUxNCwyLjQ0MjE1IC00LjA2NTg1LDUuMjAxNDUgLTQuNTQxMDUsOC4wNDUzOSAtMC43NTkwNCw0LjYyMTY5IDEuMzIzMTcsOS4yODI5NSA0LjExMTIzLDEzLjYzNTEgMCwwIDAsMCAwLDAgMi43NTkzNSw0LjM1NDYxIDYuMTYzNTcsOC41Mjc1MSA4LjE0ODAzLDEyLjc4MjE2IDAsMCAwLDAgMCwwIDEuNTc4NDIsMy4zNTc1IDIuMzM2MDYsNi4yODgzMSAyLjI2MzU5LDkuNzE3MjggeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ0YWEwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzA1LTEtNCIKICAgICAgICAgZD0ibSAzOTUuNjAwOTYsNDgyLjYyNTcgLTQuNzIwOCwwIGMgMC4zNzk3LC03LjI1ODA5IDMuNzgzODYsLTE0LjAxNTUxIDkuNzM2NjEsLTIwLjI3ODQzIDMuNzUwNCwtMy45NDUyNyA4LjQ5ODI0LC03LjU1NjkzIDE0LjAyMTc0LC0xMC43MDA5IC00LjgzOTA3LDMuNDcyNjcgLTguNzMxNTYsNy4zMDM3NyAtMTEuNTQ5MjUsMTEuMzI1OTEgLTQuNDcxNzcsNi4zODI1MyAtOC41MjAzOSwxMy4wMTU0NyAtNy40ODgzLDE5LjY1MzQyIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDI5Ny0wLTEiCiAgICAgICAgIGQ9Im0gNDQxLjI1MzcxLDQ4Mi42MjU3IC03LjAzMDAzLDAgYyAxLjA4ODAzLC04LjgzNzU0IDQuMzU4NTcsLTE3LjQwMjc2IDkuNTY0NTYsLTI1LjM5Mzg1IDIuNDMxNTksLTMuNzMyMzQgNS4yODIxNywtNy4zMjU4OSA4LjUxMTcyLC0xMC43NDIzIC0yLjU3MzEyLDMuNjUwMTMgLTQuNzEzNTgsNy40MTIwMSAtNi40MDQ2OSwxMS4yNDA0NiAtMy42MjAzLDguMTk1NzggLTUuMTY3ODcsMTYuNTM4NTYgLTQuNjQxNTYsMjQuODk1NjkgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ0YWEwMDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0Mjk5LTYtMyIKICAgICAgICAgZD0ibSA0NzkuMTcwNDIsNDgyLjYyNTY5IC01LjI1MjI0LDAgYyAwLjQ5MTQzLC0zLjc2NjEzIDEuNTM0NzEsLTYuODc0OTMgMy43NzQsLTEwLjM5ODg0IDIuODQ5MTMsLTQuNDU3OTIgNS40NjAxNSwtOC42NzExMyA4Ljc5MTE3LC0xMi43ODQwNCAwLDAgMCwwIDAsMCAzLjMwMTk3LC00LjExNDkgNi4wMjM5NSwtOC40MzUzNiA1Ljk0MTE3LC0xMi45MTU2OCAtMC4wNDI2LC0yLjc1NTY3IC0xLjE1NDEzLC01LjUzMjM3IC0zLjI3MjMsLTguMDgxMzYgMi40OTUxNCwyLjQ0MjE1IDQuMDY1ODUsNS4yMDE0NSA0LjU0MTA1LDguMDQ1MzkgMC43NTkwNCw0LjYyMTY5IC0xLjMyMzE3LDkuMjgyOTUgLTQuMTExMjMsMTMuNjM1MSAwLDAgMCwwIDAsMCAtMi43NTkzNSw0LjM1NDYxIC02LjE2MzU3LDguNTI3NTEgLTguMTQ4MDMsMTIuNzgyMTYgMCwwIDAsMCAwLDAgLTEuNTc4NDIsMy4zNTc1IC0yLjMzNjA2LDYuMjg4MzEgLTIuMjYzNTksOS43MTcyOCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDQzMS4zNjAyLDQ4Mi42MjU3IDQuNzIwOCwwIGMgLTAuMzc5NywtNy4yNTgwOSAtMy43ODM4NiwtMTQuMDE1NTEgLTkuNzM2NjEsLTIwLjI3ODQzIC0zLjc1MDQsLTMuOTQ1MjcgLTguNDk4MjQsLTcuNTU2OTMgLTE0LjAyMTc0LC0xMC43MDA5IDQuODM5MDcsMy40NzI2NyA4LjczMTU2LDcuMzAzNzcgMTEuNTQ5MjUsMTEuMzI1OTEgNC40NzE3Niw2LjM4MjUzIDguNTIwMzksMTMuMDE1NDcgNy40ODgzLDE5LjY1MzQyIHoiCiAgICAgICAgIGlkPSJwYXRoNDQ3MC0wIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDQ1Mi40MTc0Myw0ODIuNjI1NjkgNy4wMzAwMywwIGMgLTEuMDg4MDMsLTguODM3NTMgLTQuMzU4NTcsLTE3LjQwMjc1IC05LjU2NDU1LC0yNS4zOTM4NSAtMi40MzE2LC0zLjczMjMzIC01LjI4MjE3LC03LjMyNTg4IC04LjUxMTcyLC0xMC43NDIyOSAyLjU3MzExLDMuNjUwMTIgNC43MTM1Nyw3LjQxMjAxIDYuNDA0NjgsMTEuMjQwNDUgMy42MjAzMSw4LjE5NTc4IDUuMTY3ODcsMTYuNTM4NTcgNC42NDE1NiwyNC44OTU3IHoiCiAgICAgICAgIGlkPSJwYXRoNDQ3Mi0zIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDQzNi4wNjM0Myw0ODIuNjI1NjkgNS4yNTIyNSwwIGMgLTAuNDkxNDQsLTMuNzY2MTMgLTEuNTM0NzIsLTYuODc0OTMgLTMuNzc0MDEsLTEwLjM5ODg0IC0yLjg0OTEzLC00LjQ1NzkyIC01LjQ2MDE1LC04LjY3MTEzIC04Ljc5MTE3LC0xMi43ODQwNCAwLDAgMCwwIDAsMCAtMy4zMDE5NywtNC4xMTQ5IC02LjAyMzk1LC04LjQzNTM2IC01Ljk0MTE3LC0xMi45MTU2OCAwLjA0MjcsLTIuNzU1NjcgMS4xNTQxMywtNS41MzIzNyAzLjI3MjMsLTguMDgxMzYgLTIuNDk1MTQsMi40NDIxNSAtNC4wNjU4NSw1LjIwMTQ1IC00LjU0MTA1LDguMDQ1MzkgLTAuNzU5MDQsNC42MjE2OSAxLjMyMzE3LDkuMjgyOTUgNC4xMTEyMywxMy42MzUxIDAsMCAwLDAgMCwwIDIuNzU5MzUsNC4zNTQ2MSA2LjE2MzU3LDguNTI3NTEgOC4xNDgwMywxMi43ODIxNiAwLDAgMCwwIDAsMCAxLjU3ODQyLDMuMzU3NSAyLjMzNjA2LDYuMjg4MzEgMi4yNjM1OSw5LjcxNzI4IHoiCiAgICAgICAgIGlkPSJwYXRoNDQ3OC0yIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ0OTgtOSIKICAgICAgICAgZD0ibSA0MTkuNDI1OTQsNDgyLjYyNTcgLTQuNzIwNzksMCBjIDAuMzc5NywtNy4yNTgwOSAzLjc4Mzg1LC0xNC4wMTU1MSA5LjczNjYsLTIwLjI3ODQzIDMuNzUwNCwtMy45NDUyNyA4LjQ5ODI0LC03LjU1NjkzIDE0LjAyMTc0LC0xMC43MDA5IC00LjgzOTA3LDMuNDcyNjcgLTguNzMxNTUsNy4zMDM3NyAtMTEuNTQ5MjUsMTEuMzI1OTEgLTQuNDcxNzYsNi4zODI1MyAtOC41MjAzOCwxMy4wMTU0NyAtNy40ODgzLDE5LjY1MzQyIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUwMC03IgogICAgICAgICBkPSJtIDQzNi40ODg3Myw0ODIuNjI1NjkgLTcuMDMwMDMsMCBjIDEuMDg4MDMsLTguODM3NTMgNC4zNTg1NywtMTcuNDAyNzUgOS41NjQ1NSwtMjUuMzkzODUgMi40MzE1OSwtMy43MzIzMyA1LjI4MjE2LC03LjMyNTg4IDguNTExNzIsLTEwLjc0MjI5IC0yLjU3MzEyLDMuNjUwMTIgLTQuNzEzNTgsNy40MTIwMSAtNi40MDQ2OSwxMS4yNDA0NSAtMy42MjAzLDguMTk1NzggLTUuMTY3ODYsMTYuNTM4NTcgLTQuNjQxNTUsMjQuODk1NyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDRhYTAwO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ1MDYtOCIKICAgICAgICAgZD0ibSA0MTIuMzQwMjMsNDgyLjYyNTY5IC01LjI1MjI1LDAgYyAwLjQ5MTQ0LC0zLjc2NjEzIDEuNTM0NzIsLTYuODc0OTMgMy43NzQwMSwtMTAuMzk4ODQgMi44NDkxMywtNC40NTc5MiA1LjQ2MDE0LC04LjY3MTEzIDguNzkxMTcsLTEyLjc4NDA0IDAsMCAwLDAgMCwwIDMuMzAxOTcsLTQuMTE0OSA2LjAyMzk1LC04LjQzNTM2IDUuOTQxMTcsLTEyLjkxNTY4IC0wLjA0MjcsLTIuNzU1NjcgLTEuMTU0MTMsLTUuNTMyMzcgLTMuMjcyMywtOC4wODEzNiAyLjQ5NTE0LDIuNDQyMTUgNC4wNjU4NSw1LjIwMTQ1IDQuNTQxMDUsOC4wNDUzOSAwLjc1OTA0LDQuNjIxNjkgLTEuMzIzMTcsOS4yODI5NSAtNC4xMTEyMywxMy42MzUxIDAsMCAwLDAgMCwwIC0yLjc1OTM1LDQuMzU0NjEgLTYuMTYzNTgsOC41Mjc1MSAtOC4xNDgwNCwxMi43ODIxNiAwLDAgMCwwIDAsMCAtMS41Nzg0MSwzLjM1NzUgLTIuMzM2MDUsNi4yODgzMSAtMi4yNjM1OCw5LjcxNzI4IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0NGFhMDA7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNTIwLjc5Njg3LDQ4Mi42MjU3IC03LjAzMDAzLDAgYyAxLjA4ODAzLC04LjgzNzU0IDQuMzU4NTcsLTE3LjQwMjc2IDkuNTY0NTUsLTI1LjM5Mzg1IDIuNDMxNiwtMy43MzIzNCA1LjI4MjE3LC03LjMyNTg5IDguNTExNzMsLTEwLjc0MjMgLTIuNTczMTIsMy42NTAxMyAtNC43MTM1OCw3LjQxMjAxIC02LjQwNDY5LDExLjI0MDQ2IC0zLjYyMDMxLDguMTk1NzggLTUuMTY3ODcsMTYuNTM4NTYgLTQuNjQxNTYsMjQuODk1NjkgeiIKICAgICAgICAgaWQ9InBhdGg1NTM0IiAvPgogICAgPC9nPgogICAgPGcKICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU1NS43MzgyNCwyMy4wNDA5NjEpIgogICAgICAgaWQ9ImczMTQwIgogICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MSIKICAgICAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0iL2hvbWUvc2FyYWgvcGxhdG9uaWtvL3BsYXRvbmlrby9tZWRpYS9pbWcvZ3Jhc3MucG5nIgogICAgICAgaW5rc2NhcGU6ZXhwb3J0LXhkcGk9IjkwLjA0NDY0NyIKICAgICAgIGlua3NjYXBlOmV4cG9ydC15ZHBpPSI5MC4wNDQ2NDciPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjY2NjY2MiCiAgICAgICAgIGlkPSJwYXRoNDI5NSIKICAgICAgICAgZD0ibSAyNjUuNzQyMzUsNDgyLjYyNTcgNS40MjMzNywwIGMgLTEuNTc0NzMsLTkuNDk5OTMgMC4zMDA4NSwtMjIuOTAxOTYgOS4xNDUyOSwtMzAuOTcyMzkgNC4yNjg0MiwtMy44OTYyNiAxMy4zMjAwOSwtNC4wNjgzNCAxOS40ODUyNCwtNi44MDA3OCAtNi41NTgwMywyLjMwMTkzIC0xNi4yMzUyNCwyLjEzNTc5IC0yMS4yNjg1Myw1Ljg1NjU1IC0xMC40MzY4Myw3LjcxODczIC0xMi44NjAzMywyMS4xODUxIC0xMi43ODUzNywzMS45MTY2MiBsIDAsMCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDMiCiAgICAgICAgIGQ9Im0gMjg1LjI3ODYxLDQ4Mi42MjU3IDMuOTk3MDMsMCAtMy4zMzAzNCwtMzMuMzEwMDcgLTAuNjY2NjksMzMuMzEwMDcgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzAxIgogICAgICAgICBkPSJtIDI3NS4zNDU4Nyw0ODIuNjI1NyA0LjUwNjcsMCBjIC0yLjMwNzk2LC05LjM0MjUyIC02LjQ5ODQyLC0xNy44ODk3MiAtMTYuMTQ4ODYsLTI0LjQ1NDIyIC00LjQ3MTc5LC0zLjA0MTExIC05LjU2MDM2LC01LjYzODYxIC0xNS4wNDk0MywtNy43MDYzMiA1LjA4MzI4LDIuNDc3MDEgOS41OTAzNSw1LjQwODE5IDEzLjM2Mjc3LDguNjYzODIgOC4xMzY2NSw3LjAyMDg1IDEyLjc3NTIyLDE1LjAwMTMzIDEzLjMyODgyLDIzLjQ5NjcyIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NjY2NjYyIKICAgICAgICAgaWQ9InBhdGg0Mjk1LTEiCiAgICAgICAgIGQ9Im0gMzU5LjY0Mjg2LDQ4Mi42MjU3IC01LjQyMzM3LDAgYyAxLjU3NDczLC05LjQ5OTkzIC0wLjMwMDg0LC0yMi45MDE5NiAtOS4xNDUyOCwtMzAuOTcyMzkgLTQuMjY4NDIsLTMuODk2MjYgLTEzLjMyMDEsLTQuMDY4MzQgLTE5LjQ4NTI1LC02LjgwMDc4IDYuNTU4MDMsMi4zMDE5MyAxNi4yMzUyNCwyLjEzNTc5IDIxLjI2ODUzLDUuODU2NTUgMTAuNDM2ODMsNy43MTg3MyAxMi44NjAzNCwyMS4xODUxIDEyLjc4NTM3LDMxLjkxNjYyIGwgMCwwIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwMy03IgogICAgICAgICBkPSJtIDM3MC44MDcxNiw0ODIuNjI1NyAtMy45OTcwNCwwIDMuMzMwMzQsLTMzLjMxMDA3IDAuNjY2NywzMy4zMTAwNyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDEtNSIKICAgICAgICAgZD0ibSAzNDIuNzQ5NCw0ODIuNjI1NyAtNC41MDY3LDAgYyAyLjMwNzk2LC05LjM0MjUyIDYuNDk4NDIsLTE3Ljg4OTcxIDE2LjE0ODg1LC0yNC40NTQyMiA0LjQ3MTc5LC0zLjA0MTExIDkuNTYwMzcsLTUuNjM4NjEgMTUuMDQ5NDQsLTcuNzA2MzIgLTUuMDgzMjgsMi40NzcwMSAtOS41OTAzNSw1LjQwODE5IC0xMy4zNjI3Nyw4LjY2MzgyIC04LjEzNjY1LDcuMDIwODUgLTEyLjc3NTIzLDE1LjAwMTMzIC0xMy4zMjg4MiwyMy40OTY3MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDMyMS44NDg5NSw0ODIuNjI1NyA1LjQyMzM2LDAgYyAtMS41NzQ3MywtOS40OTk5MyAwLjMwMDg1LC0yMi45MDE5NiA5LjE0NTMsLTMwLjk3MjM5IDQuMjY4NDEsLTMuODk2MjYgMTMuMzIwMDksLTQuMDY4MzQgMTkuNDg1MjQsLTYuODAwNzggLTYuNTU4MDMsMi4zMDE5MyAtMTYuMjM1MjUsMi4xMzU3OSAtMjEuMjY4NTMsNS44NTY1NSAtMTAuNDM2ODMsNy43MTg3MyAtMTIuODYwMzQsMjEuMTg1MSAtMTIuNzg1MzcsMzEuOTE2NjIgbCAwLDAgeiIKICAgICAgICAgaWQ9InBhdGg0NDc2IgogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjY2NjY2MiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzE2LjI5NzE4LDQ4Mi42MjU3IDMuOTk3MDQsMCAtMy4zMzAzNCwtMzMuMzEwMDcgLTAuNjY2NywzMy4zMTAwNyB6IgogICAgICAgICBpZD0icGF0aDQ0ODAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzYzLjA2MzQ1LDQ4Mi42MjU3IDQuNTA2NywwIGMgLTIuMzA3OTYsLTkuMzQyNTIgLTYuNDk4NDIsLTE3Ljg4OTcyIC0xNi4xNDg4NiwtMjQuNDU0MjIgLTQuNDcxNzksLTMuMDQxMTEgLTkuNTYwMzYsLTUuNjM4NjEgLTE1LjA0OTQzLC03LjcwNjMyIDUuMDgzMjgsMi40NzcwMSA5LjU5MDM1LDUuNDA4MTkgMTMuMzYyNzcsOC42NjM4MiA4LjEzNjY1LDcuMDIwODUgMTIuNzc1MjIsMTUuMDAxMzMgMTMuMzI4ODIsMjMuNDk2NzIgeiIKICAgICAgICAgaWQ9InBhdGg0NDgyIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjY2NjY2MiCiAgICAgICAgIGlkPSJwYXRoNDUwNCIKICAgICAgICAgZD0ibSAzNTcuNzcyMDEsNDgyLjYyNTcgLTUuNDIzMzcsMCBjIDEuNTc0NzMsLTkuNDk5OTMgLTAuMzAwODUsLTIyLjkwMTk2IC05LjE0NTI5LC0zMC45NzIzOSAtNC4yNjg0MiwtMy44OTYyNiAtMTMuMzIwMDksLTQuMDY4MzQgLTE5LjQ4NTI0LC02LjgwMDc4IDYuNTU4MDMsMi4zMDE5MyAxNi4yMzUyNCwyLjEzNTc5IDIxLjI2ODUzLDUuODU2NTUgMTAuNDM2ODMsNy43MTg3MyAxMi44NjAzMywyMS4xODUxIDEyLjc4NTM3LDMxLjkxNjYyIGwgMCwwIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUwOCIKICAgICAgICAgZD0ibSAzMjQuMDM1OTIsNDgyLjYyNTcgLTMuOTk3MDMsMCAzLjMzMDM0LC0zMy4zMTAwNyAwLjY2NjY5LDMzLjMxMDA3IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUxMCIKICAgICAgICAgZD0ibSAzMjUuOTExNzUsNDgyLjYyNTcgLTQuNTA2NywwIGMgMi4zMDc5NiwtOS4zNDI1MiA2LjQ5ODQyLC0xNy44ODk3MSAxNi4xNDg4NSwtMjQuNDU0MjIgNC40NzE4LC0zLjA0MTExIDkuNTYwMzcsLTUuNjM4NjEgMTUuMDQ5NDQsLTcuNzA2MzIgLTUuMDgzMjgsMi40NzcwMSAtOS41OTAzNSw1LjQwODE5IC0xMy4zNjI3Nyw4LjY2MzgyIC04LjEzNjY1LDcuMDIwODUgLTEyLjc3NTIyLDE1LjAwMTMzIC0xMy4zMjg4MiwyMy40OTY3MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjY2NjY2MiCiAgICAgICAgIGlkPSJwYXRoNDI5NS0zIgogICAgICAgICBkPSJtIDQwMi40MTA3MSw0ODIuNjI1NyA1LjQyMzM3LDAgYyAtMS41NzQ3MywtOS40OTk5MyAwLjMwMDg1LC0yMi45MDE5NiA5LjE0NTI5LC0zMC45NzIzOSA0LjI2ODQyLC0zLjg5NjI2IDEzLjMyMDA5LC00LjA2ODM0IDE5LjQ4NTI0LC02LjgwMDc4IC02LjU1ODAzLDIuMzAxOTMgLTE2LjIzNTI0LDIuMTM1NzkgLTIxLjI2ODUzLDUuODU2NTUgLTEwLjQzNjgzLDcuNzE4NzMgLTEyLjg2MDMzLDIxLjE4NTEgLTEyLjc4NTM3LDMxLjkxNjYyIGwgMCwwIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwMy0wIgogICAgICAgICBkPSJtIDQwMy4xNDMzMiw0ODIuNjI1NyAzLjk5NzA0LDAgLTMuMzMwMzQsLTMzLjMxMDA3IC0wLjY2NjcsMzMuMzEwMDcgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzAxLTAiCiAgICAgICAgIGQ9Im0gNTAyLjAwNDI1LDQ4Mi42MjU3IDQuNTA2NywwIGMgLTIuMzA3OTYsLTkuMzQyNTIgLTYuNDk4NDIsLTE3Ljg4OTcyIC0xNi4xNDg4NSwtMjQuNDU0MjIgLTQuNDcxNzksLTMuMDQxMTEgLTkuNTYwMzcsLTUuNjM4NjEgLTE1LjA0OTQ0LC03LjcwNjMyIDUuMDgzMjgsMi40NzcwMSA5LjU5MDM1LDUuNDA4MTkgMTMuMzYyNzcsOC42NjM4MiA4LjEzNjY1LDcuMDIwODUgMTIuNzc1MjMsMTUuMDAxMzMgMTMuMzI4ODIsMjMuNDk2NzIgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY2NjY2NjIgogICAgICAgICBpZD0icGF0aDQyOTUtMS04IgogICAgICAgICBkPSJtIDQ3Ni45NjU0Myw0ODIuNjI1NyAtNS40MjMzNywwIGMgMS41NzQ3MywtOS40OTk5MyAtMC4zMDA4NSwtMjIuOTAxOTYgLTkuMTQ1MjksLTMwLjk3MjM5IC00LjI2ODQyLC0zLjg5NjI2IC0xMy4zMjAwOSwtNC4wNjgzNCAtMTkuNDg1MjQsLTYuODAwNzggNi41NTgwMywyLjMwMTkzIDE2LjIzNTI0LDIuMTM1NzkgMjEuMjY4NTIsNS44NTY1NSAxMC40MzY4Myw3LjcxODczIDEyLjg2MDM0LDIxLjE4NTEgMTIuNzg1MzgsMzEuOTE2NjIgbCAwLDAgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzAzLTctMSIKICAgICAgICAgZD0ibSAzOTkuOTkyODUsNDgyLjYyNTcgLTMuOTk3MDMsMCAzLjMzMDMzLC0zMy4zMTAwNyAwLjY2NjcsMzMuMzEwMDcgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzQ3ZGMxOTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzAxLTUtMyIKICAgICAgICAgZD0ibSA0NjMuMTQxODYsNDgyLjYyNTcgLTQuNTA2NjksMCBjIDIuMzA3OTUsLTkuMzQyNTIgNi40OTg0MiwtMTcuODg5NzEgMTYuMTQ4ODUsLTI0LjQ1NDIyIDQuNDcxNzksLTMuMDQxMTEgOS41NjAzNywtNS42Mzg2MSAxNS4wNDk0NCwtNy43MDYzMiAtNS4wODMyOCwyLjQ3NzAxIC05LjU5MDM1LDUuNDA4MTkgLTEzLjM2Mjc3LDguNjYzODIgLTguMTM2NjUsNy4wMjA4NSAtMTIuNzc1MjMsMTUuMDAxMzMgLTEzLjMyODgzLDIzLjQ5NjcyIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNDg1Ljc5ODE5LDQ4Mi42MjU3IDUuNDIzMzcsMCBjIC0xLjU3NDczLC05LjQ5OTkzIDAuMzAwODUsLTIyLjkwMTk2IDkuMTQ1MjksLTMwLjk3MjM5IDQuMjY4NDIsLTMuODk2MjYgMTMuMzIwMSwtNC4wNjgzNCAxOS40ODUyNCwtNi44MDA3OCAtNi41NTgwMywyLjMwMTkzIC0xNi4yMzUyNCwyLjEzNTc5IC0yMS4yNjg1Myw1Ljg1NjU1IC0xMC40MzY4Myw3LjcxODczIC0xMi44NjAzMywyMS4xODUxIC0xMi43ODUzNywzMS45MTY2MiBsIDAsMCB6IgogICAgICAgICBpZD0icGF0aDQ0NzYtMiIKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY2NjY2NjIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDM5OC4zNzgzMSw0ODIuNjI1NyAzLjk5NzA0LDAgLTMuMzMwMzQsLTMzLjMxMDA3IC0wLjY2NjcsMzMuMzEwMDcgeiIKICAgICAgICAgaWQ9InBhdGg0NDgwLTMiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNTI4LjIxMTcyLDQ4Mi42MjU3IDQuNTA2NywwIGMgLTIuMzA3OTYsLTkuMzQyNTIgLTYuNDk4NDIsLTE3Ljg4OTcyIC0xNi4xNDg4NiwtMjQuNDU0MjIgLTQuNDcxNzksLTMuMDQxMTEgLTkuNTYwMzYsLTUuNjM4NjEgLTE1LjA0OTQ0LC03LjcwNjMyIDUuMDgzMjksMi40NzcwMSA5LjU5MDM1LDUuNDA4MTkgMTMuMzYyNzcsOC42NjM4MiA4LjEzNjY2LDcuMDIwODUgMTIuNzc1MjMsMTUuMDAxMzMgMTMuMzI4ODMsMjMuNDk2NzIgeiIKICAgICAgICAgaWQ9InBhdGg0NDgyLTYiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NjY2NjYyIKICAgICAgICAgaWQ9InBhdGg0NTA0LTMiCiAgICAgICAgIGQ9Im0gNDI0LjU1MDQ0LDQ4Mi42MjU3IC01LjQyMzM3LDAgYyAxLjU3NDczLC05LjQ5OTkzIC0wLjMwMDg1LC0yMi45MDE5NiAtOS4xNDUyOSwtMzAuOTcyMzkgLTQuMjY4NDIsLTMuODk2MjYgLTEzLjMyMDA5LC00LjA2ODM0IC0xOS40ODUyNCwtNi44MDA3OCA2LjU1ODAzLDIuMzAxOTMgMTYuMjM1MjQsMi4xMzU3OSAyMS4yNjg1Myw1Ljg1NjU1IDEwLjQzNjgzLDcuNzE4NzMgMTIuODYwMzMsMjEuMTg1MSAxMi43ODUzNywzMS45MTY2MiBsIDAsMCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ1MDgtMCIKICAgICAgICAgZD0ibSA0MzUuNzMwMzMsNDgyLjYyNTcgLTMuOTk3MDMsMCAzLjMzMDM0LC0zMy4zMTAwNyAwLjY2NjY5LDMzLjMxMDA3IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM0N2RjMTk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUxMC0xIgogICAgICAgICBkPSJtIDQ0Ni40NjQzNiw0ODIuNjI1NyAtNC41MDY3LDAgYyAyLjMwNzk2LC05LjM0MjUyIDYuNDk4NDIsLTE3Ljg4OTcxIDE2LjE0ODg1LC0yNC40NTQyMiA0LjQ3MTc5LC0zLjA0MTExIDkuNTYwMzcsLTUuNjM4NjEgMTUuMDQ5NDQsLTcuNzA2MzIgLTUuMDgzMjgsMi40NzcwMSAtOS41OTAzNSw1LjQwODE5IC0xMy4zNjI3Nyw4LjY2MzgyIC04LjEzNjY1LDcuMDIwODUgLTEyLjc3NTIyLDE1LjAwMTMzIC0xMy4zMjg4MiwyMy40OTY3MiB6IgogICAgICAgICBzdHlsZT0iZmlsbDojNDdkYzE5O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgPC9nPgogICAgPGcKICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU1NS43MzgyNCwyMy4wNDA5NjEpIgogICAgICAgaWQ9ImczMDQ1IgogICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MSIKICAgICAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0iL2hvbWUvc2FyYWgvcGxhdG9uaWtvL3BsYXRvbmlrby9tZWRpYS9pbWcvZ3Jhc3MucG5nIgogICAgICAgaW5rc2NhcGU6ZXhwb3J0LXhkcGk9IjkwLjA0NDY0NyIKICAgICAgIGlua3NjYXBlOmV4cG9ydC15ZHBpPSI5MC4wNDQ2NDciPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDciCiAgICAgICAgIGQ9Im0gMjU1LjU3NzI0LDQ4Mi42MjU3IDMuOTI5NDEsMCBjIC0wLjc4MzY0LC0xLjU5MTM5IC0wLjEwMTM3LC0zLjI5Njg2IDAuMTQ4MDYsLTUuNDc2NTkgMC4yNjc2OSwtMi4zODI3NSAzLjI4MjAyLC01LjkzMDgxIDUuMDc5MDgsLTcuODgxMDggLTIuMzg1NjcsMC43MDY5NiAtNC43NDE0MiwyLjQzODU2IC02LjQ2MzM5LDUuMDc4MjkgLTEuNTcwNjYsMi40MTQ3NCAtMi41Nzk4NCw0Ljg3NTYyIC0yLjY5MzE2LDguMjc5MzggeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzE1IgogICAgICAgICBkPSJtIDI2Ni41MzU0OSw0ODIuNjI1NyAzLjc0MDAzLDAgYyAwLjA4NjgsLTUuNzEyNCAtMi44MTk5MywtOC42MzMwNiAtNi41ODI3OCwtMTEuMzMyNzggLTAuODQ3NywtMC43ODc1NSAtMS40NTIxMiwtMi4yMzU2MiAtMS40MDY5OSwtMy43NTUyNyAwLjAzNzgsLTEuNTIxNTggMC43NDU1OCwtMy4xNzkzMyAxLjk5MTEsLTQuMjM1MDYgLTEuNDcxOCwwLjUzODAyIC0yLjgxOTM1LDEuOTMwMzMgLTMuNDU2NTIsMy44NDkyNCAtMC42Mjk4OCwxLjkyMDg0IC0wLjUxODk0LDQuMjUyMjYgMC40ODkxLDYuMjYyNDIgMC43NTg3MiwxLjQzODA4IDEuNTk5NDQsMS41MjYxMyAyLjUxNTEyLDIuMzk5ODYgMi4zMDQ0MiwxLjExMzI2IDMuMTQ3NDYsNC4xODU2MiAyLjcxMDk0LDYuODExNTkgbCAwLDAgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzEzIgogICAgICAgICBkPSJtIDI4My44MzQ5Miw0ODIuNjI1NyAzLjg1ODA4LDAgYyAtMC4wNjgzLC0yLjQxNzU4IDAuMTQ2NTQsLTQuNjYxNzYgMC42NjU2MiwtNy4xNTQyNyAwLjY5MTY4LC0zLjMyMzkxIDEuOTMyNSwtNi42MzQ2NyAzLjcwOTMsLTkuNjg0NTIgLTIuNzA0MiwxLjkzMDA0IC0zLjI1MTE3LDQuMjg1MDkgLTUuMzQ3MDgsNy4zODg5NiAtMS41NzA3NCwyLjMyNjMxIC0xLjg0NjIyLDYuNTkzMzkgLTIuODg1OTIsOS40NDk4MyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMTEiCiAgICAgICAgIGQ9Im0gMjczLjIxMDIyLDQ4Mi42MjU3IDIuOTM1NywwIGMgLTAuMzYyMjMsLTcuNTg4MTQgLTIuMDU2MTUsLTE0LjIxMTkzIC0yLjg4ODQ2LC0yMS42ODg2OSAtMS4xMDMxOCw0LjI5NDYxIC0wLjUzNjEzLDExLjE2MDkzIC0wLjIxNDI3LDE1LjY1MDA1IDAuMjA2ODcsMi44ODUyMyAwLjc5NTE2LDMuMDIzNDggMC4xNjcwMyw2LjAzODY0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwOSIKICAgICAgICAgZD0ibSAyNzcuOTkzODEsNDgyLjYyNTcgMy44Mjk5NCwwIGMgLTAuODkzOTIsLTQuODY3NTEgMC4yOTk1NCwtNS4zMTI3OCAtMS40NDYyNSwtMTAuMzY5ODkgLTAuODk3OTcsLTIuNjAxMjIgLTMuNzUyNTUsLTYuNTcyNCAtNS42MTg0MywtOC4xMzA0IDEuMjE4MDQsMi4yNjAxNSAyLjEyOTk0LDQuNjYwNzggMi43Mjc2NSw3LjA5MTc1IDAuOTgwOTQsMy45ODkxNiAxLjExMjE3LDcuNjk3MjIgMC41MDcwOSwxMS40MDg1NCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDctOCIKICAgICAgICAgZD0ibSAzNzMuNTkyMjQsNDgyLjYyNTcgLTMuOTI5NDIsMCBjIDAuNzgzNjUsLTEuNTkxMzkgMC4xMDEzOCwtMy4yOTY4NiAtMC4xNDgwNSwtNS40NzY2IC0wLjI2NzY5LC0yLjM4Mjc0IC0zLjI4MjAyLC01LjkzMDggLTUuMDc5MDgsLTcuODgxMDcgMi4zODU2NywwLjcwNjk2IDQuNzQxNDIsMi40Mzg1NiA2LjQ2MzM5LDUuMDc4MjkgMS41NzA2NSwyLjQxNDc0IDIuNTc5ODQsNC44NzU2MiAyLjY5MzE2LDguMjc5MzggeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzE1LTUiCiAgICAgICAgIGQ9Im0gMzIxLjA2MDkyLDQ4Mi42MjU3IC0zLjc0MDAzLDAgYyAtMC4wODY4LC01LjcxMjQgMi44MTk5MywtOC42MzMwNiA2LjU4Mjc4LC0xMS4zMzI3OCAwLjg0NzcsLTAuNzg3NTUgMS40NTIxMiwtMi4yMzU2MiAxLjQwNjk5LC0zLjc1NTI3IC0wLjAzNzgsLTEuNTIxNTggLTAuNzQ1NTgsLTMuMTc5MzMgLTEuOTkxMSwtNC4yMzUwNiAxLjQ3MTgsMC41MzgwMiAyLjgxOTM1LDEuOTMwMzMgMy40NTY1MiwzLjg0OTI0IDAuNjI5ODgsMS45MjA4NCAwLjUxODk0LDQuMjUyMjYgLTAuNDg5MTEsNi4yNjI0MiAtMC43NTg3MSwxLjQzODA4IC0xLjU5OTQzLDEuNTI2MTMgLTIuNTE1MTEsMi4zOTk4NiAtMi4zMDQ0MiwxLjExMzI2IC0zLjE0NzQ2LDQuMTg1NjIgLTIuNzEwOTQsNi44MTE1OSBsIDAsMCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMTMtMCIKICAgICAgICAgZD0ibSAzNjAuMDM0NTIsNDgyLjYyNTcgLTMuODU4MDcsMCBjIDAuMDY4MywtMi40MTc1OCAtMC4xNDY1NCwtNC42NjE3NiAtMC42NjU2MiwtNy4xNTQyNyAtMC42OTE2OCwtMy4zMjM5MSAtMS45MzI1LC02LjYzNDY3IC0zLjcwOTMxLC05LjY4NDUyIDIuNzA0MjEsMS45MzAwNCAzLjI1MTE4LDQuMjg1MDkgNS4zNDcwOSw3LjM4ODk2IDEuNTcwNzMsMi4zMjYzMSAxLjg0NjIxLDYuNTkzMzkgMi44ODU5MSw5LjQ0OTgzIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMxMS0yIgogICAgICAgICBkPSJtIDM2Mi42OTczOCw0ODIuNjI1NyAtMi45MzU2OSwwIGMgMC4zNjIyMywtNy41ODgxNCAyLjA1NjE0LC0xNC4yMTE5MyAyLjg4ODQ2LC0yMS42ODg2OSAxLjEwMzE4LDQuMjk0NjEgMC41MzYxMiwxMS4xNjA5MyAwLjIxNDI2LDE1LjY1MDA1IC0wLjIwNjg3LDIuODg1MjMgLTAuNzk1MTUsMy4wMjM0OCAtMC4xNjcwMyw2LjAzODY0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwOS02IgogICAgICAgICBkPSJtIDMyNC40MTExOCw0ODIuNjI1NyAtMy44Mjk5NCwwIGMgMC44OTM5MiwtNC44Njc1MSAtMC4yOTk1MywtNS4zMTI3OCAxLjQ0NjI1LC0xMC4zNjk4OSAwLjg5Nzk3LC0yLjYwMTIyIDMuNzUyNTUsLTYuNTcyNCA1LjYxODQzLC04LjEzMDQgLTEuMjE4MDMsMi4yNjAxNSAtMi4xMjk5Myw0LjY2MDc4IC0yLjcyNzY1LDcuMDkxNzUgLTAuOTgwOTQsMy45ODkxNiAtMS4xMTIxNyw3LjY5NzIyIC0wLjUwNzA5LDExLjQwODU0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzI2LjY5MTQ5LDQ4Mi42MjU3IDMuOTI5NDEsMCBjIC0wLjc4MzY0LC0xLjU5MTM5IC0wLjEwMTM4LC0zLjI5Njg2IDAuMTQ4MDYsLTUuNDc2NTkgMC4yNjc2OSwtMi4zODI3NSAzLjI4MjAxLC01LjkzMDgxIDUuMDc5MDcsLTcuODgxMDggLTIuMzg1NjcsMC43MDY5NiAtNC43NDE0MiwyLjQzODU2IC02LjQ2MzM4LDUuMDc4MjkgLTEuNTcwNjYsMi40MTQ3NCAtMi41Nzk4NSw0Ljg3NTYyIC0yLjY5MzE2LDguMjc5MzggeiIKICAgICAgICAgaWQ9InBhdGg0NDc0IiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDM2OC4zMjQ5NCw0ODIuNjI1NyAzLjc0MDAyLDAgYyAwLjA4NjgsLTUuNzEyNDEgLTIuODE5OTIsLTguNjMzMDYgLTYuNTgyNzgsLTExLjMzMjc4IC0wLjg0NzY5LC0wLjc4NzU1IC0xLjQ1MjExLC0yLjIzNTYyIC0xLjQwNjk4LC0zLjc1NTI3IDAuMDM3OCwtMS41MjE1OCAwLjc0NTU4LC0zLjE3OTMzIDEuOTkxMDksLTQuMjM1MDYgLTEuNDcxNzksMC41MzgwMiAtMi44MTkzNCwxLjkzMDMzIC0zLjQ1NjUyLDMuODQ5MjQgLTAuNjI5ODcsMS45MjA4NCAtMC41MTg5Myw0LjI1MjI1IDAuNDg5MTEsNi4yNjI0MiAwLjc1ODcyLDEuNDM4MDggMS41OTk0NCwxLjUyNjEyIDIuNTE1MTIsMi4zOTk4NSAyLjMwNDQyLDEuMTEzMjcgMy4xNDc0Niw0LjE4NTYzIDIuNzEwOTQsNi44MTE2IGwgMCwwIHoiCiAgICAgICAgIGlkPSJwYXRoNDQ4NCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSAzODIuMjU0ODEsNDgyLjYyNTcgMy44NTgwOCwwIGMgLTAuMDY4MywtMi40MTc1OCAwLjE0NjU0LC00LjY2MTc2IDAuNjY1NjIsLTcuMTU0MjggMC42OTE2OCwtMy4zMjM5IDEuOTMyNSwtNi42MzQ2NiAzLjcwOTMsLTkuNjg0NTEgLTIuNzA0MiwxLjkzMDA0IC0zLjI1MTE4LDQuMjg1MDggLTUuMzQ3MDksNy4zODg5NiAtMS41NzA3MywyLjMyNjMxIC0xLjg0NjIxLDYuNTkzMzkgLTIuODg1OTEsOS40NDk4MyB6IgogICAgICAgICBpZD0icGF0aDQ0ODYiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMzUyLjg4MDM2LDQ4Mi42MjU3IDIuOTM1NywwIGMgLTAuMzYyMjMsLTcuNTg4MTQgLTIuMDU2MTUsLTE0LjIxMTkzIC0yLjg4ODQ2LC0yMS42ODg2OSAtMS4xMDMxOCw0LjI5NDYxIC0wLjUzNjEzLDExLjE2MDkzIC0wLjIxNDI3LDE1LjY1MDA1IDAuMjA2ODcsMi44ODUyMyAwLjc5NTE2LDMuMDIzNDggMC4xNjcwMyw2LjAzODY0IHoiCiAgICAgICAgIGlkPSJwYXRoNDQ4OCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSAzMDguODQ5MTgsNDgyLjYyNTcgMy44Mjk5NSwwIGMgLTAuODkzOTMsLTQuODY3NTEgMC4yOTk1MywtNS4zMTI3OCAtMS40NDYyNiwtMTAuMzY5ODkgLTAuODk3OTcsLTIuNjAxMjIgLTMuNzUyNTUsLTYuNTcyNCAtNS42MTg0MywtOC4xMzA0IDEuMjE4MDQsMi4yNjAxNSAyLjEyOTk0LDQuNjYwNzggMi43Mjc2Niw3LjA5MTc1IDAuOTgwOTMsMy45ODkxNiAxLjExMjE3LDcuNjk3MjIgMC41MDcwOCwxMS40MDg1NCB6IgogICAgICAgICBpZD0icGF0aDQ0OTAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUwMiIKICAgICAgICAgZD0ibSAzNzcuMzMzOTQsNDgyLjYyNTcgLTMuOTI5NDEsMCBjIDAuNzgzNjQsLTEuNTkxMzkgMC4xMDEzNywtMy4yOTY4NiAtMC4xNDgwNiwtNS40NzY2IC0wLjI2NzY5LC0yLjM4Mjc0IC0zLjI4MjAyLC01LjkzMDggLTUuMDc5MDcsLTcuODgxMDcgMi4zODU2NywwLjcwNjk2IDQuNzQxNDEsMi40Mzg1NiA2LjQ2MzM4LDUuMDc4MjkgMS41NzA2NSwyLjQxNDc0IDIuNTc5ODQsNC44NzU2MiAyLjY5MzE2LDguMjc5MzggeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NTEyIgogICAgICAgICBkPSJtIDMwMC40ODE1Nyw0ODIuNjI1NyAtMy43NDAwMiwwIGMgLTAuMDg2OCwtNS43MTI0MSAyLjgxOTkyLC04LjYzMzA2IDYuNTgyNzgsLTExLjMzMjc4IDAuODQ3NjksLTAuNzg3NTUgMS40NTIxMSwtMi4yMzU2MiAxLjQwNjk4LC0zLjc1NTI3IC0wLjAzNzgsLTEuNTIxNTggLTAuNzQ1NTgsLTMuMTc5MzMgLTEuOTkxMSwtNC4yMzUwNiAxLjQ3MTgsMC41MzgwMiAyLjgxOTM1LDEuOTMwMzMgMy40NTY1MiwzLjg0OTI0IDAuNjI5ODgsMS45MjA4NCAwLjUxODk0LDQuMjUyMjYgLTAuNDg5MSw2LjI2MjQyIC0wLjc1ODcyLDEuNDM4MDggLTEuNTk5NDQsMS41MjYxMyAtMi41MTUxMiwyLjM5OTg1IC0yLjMwNDQyLDEuMTEzMjcgLTMuMTQ3NDYsNC4xODU2MyAtMi43MTA5NCw2LjgxMTYgbCAwLDAgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NTE0IgogICAgICAgICBkPSJtIDMwMy45MDkwNCw0ODIuNjI1NyAtMy44NTgwNywwIGMgMC4wNjgzLC0yLjQxNzU4IC0wLjE0NjU0LC00LjY2MTc2IC0wLjY2NTYyLC03LjE1NDI3IC0wLjY5MTY4LC0zLjMyMzkxIC0xLjkzMjUsLTYuNjM0NjcgLTMuNzA5MzEsLTkuNjg0NTIgMi43MDQyMSwxLjkzMDA0IDMuMjUxMTgsNC4yODUwOSA1LjM0NzA5LDcuMzg4OTYgMS41NzA3MywyLjMyNjMxIDEuODQ2MjEsNi41OTMzOSAyLjg4NTkxLDkuNDQ5ODMgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NTE2IgogICAgICAgICBkPSJtIDM1MS40NzIyOSw0ODIuNjI1NyAtMi45MzU2OSwwIGMgMC4zNjIyMywtNy41ODgxNCAyLjA1NjE0LC0xNC4yMTE5MyAyLjg4ODQ2LC0yMS42ODg2OSAxLjEwMzE4LDQuMjk0NjEgMC41MzYxMiwxMS4xNjA5MyAwLjIxNDI2LDE1LjY1MDA1IC0wLjIwNjg2LDIuODg1MjMgLTAuNzk1MTUsMy4wMjM0OCAtMC4xNjcwMyw2LjAzODY0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUxOCIKICAgICAgICAgZD0ibSAzNzYuNzk0OTcsNDgyLjYyNTcgLTMuODI5OTQsMCBjIDAuODkzOTIsLTQuODY3NTEgLTAuMjk5NTQsLTUuMzEyNzggMS40NDYyNSwtMTAuMzY5ODkgMC44OTc5NywtMi42MDEyMiAzLjc1MjU1LC02LjU3MjQgNS42MTg0MywtOC4xMzA0IC0xLjIxODA0LDIuMjYwMTUgLTIuMTI5OTQsNC42NjA3OCAtMi43Mjc2NSw3LjA5MTc1IC0wLjk4MDk0LDMuOTg5MTYgLTEuMTEyMTgsNy42OTcyMiAtMC41MDcwOSwxMS40MDg1NCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDctNiIKICAgICAgICAgZD0ibSAzOTkuOTIxMzMsNDgyLjYyNTcgMy45Mjk0MiwwIGMgLTAuNzgzNjUsLTEuNTkxMzkgLTAuMTAxMzgsLTMuMjk2ODYgMC4xNDgwNSwtNS40NzY1OSAwLjI2NzY5LC0yLjM4Mjc1IDMuMjgyMDIsLTUuOTMwODEgNS4wNzkwOCwtNy44ODEwOCAtMi4zODU2NywwLjcwNjk2IC00Ljc0MTQyLDIuNDM4NTYgLTYuNDYzMzksNS4wNzgyOSAtMS41NzA2NSwyLjQxNDc0IC0yLjU3OTg0LDQuODc1NjIgLTIuNjkzMTYsOC4yNzkzOCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMTUtMyIKICAgICAgICAgZD0ibSA0NDMuODAxNDIsNDgyLjYyNTcgMy43NDAwMywwIGMgMC4wODY4LC01LjcxMjQgLTIuODE5OTMsLTguNjMzMDYgLTYuNTgyNzgsLTExLjMzMjc4IC0wLjg0NzcsLTAuNzg3NTUgLTEuNDUyMTIsLTIuMjM1NjIgLTEuNDA2OTksLTMuNzU1MjcgMC4wMzc4LC0xLjUyMTU4IDAuNzQ1NTgsLTMuMTc5MzMgMS45OTExLC00LjIzNTA2IC0xLjQ3MTgsMC41MzgwMiAtMi44MTkzNSwxLjkzMDMzIC0zLjQ1NjUyLDMuODQ5MjQgLTAuNjI5ODgsMS45MjA4NCAtMC41MTg5NCw0LjI1MjI2IDAuNDg5MSw2LjI2MjQyIDAuNzU4NzIsMS40MzgwOCAxLjU5OTQ0LDEuNTI2MTMgMi41MTUxMiwyLjM5OTg2IDIuMzA0NDIsMS4xMTMyNiAzLjE0NzQ2LDQuMTg1NjIgMi43MTA5NCw2LjgxMTU5IGwgMCwwIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMxMy02IgogICAgICAgICBkPSJtIDM4Ni4wODgxMiw0ODIuNjI1NyAzLjg1ODA3LDAgYyAtMC4wNjgzLC0yLjQxNzU4IDAuMTQ2NTQsLTQuNjYxNzYgMC42NjU2MiwtNy4xNTQyNyAwLjY5MTY4LC0zLjMyMzkxIDEuOTMyNSwtNi42MzQ2NyAzLjcwOTMxLC05LjY4NDUyIC0yLjcwNDIxLDEuOTMwMDQgLTMuMjUxMTgsNC4yODUwOSAtNS4zNDcwOSw3LjM4ODk2IC0xLjU3MDc0LDIuMzI2MzEgLTEuODQ2MjEsNi41OTMzOSAtMi44ODU5MSw5LjQ0OTgzIHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMxMS0yMiIKICAgICAgICAgZD0ibSA1MDEuMDE1MjUsNDgyLjYyNTcgMi45MzU2OSwwIGMgLTAuMzYyMjMsLTcuNTg4MTQgLTIuMDU2MTQsLTE0LjIxMTkzIC0yLjg4ODQ1LC0yMS42ODg2OSAtMS4xMDMxOSw0LjI5NDYxIC0wLjUzNjEzLDExLjE2MDkzIC0wLjIxNDI3LDE1LjY1MDA1IDAuMjA2ODcsMi44ODUyMyAwLjc5NTE1LDMuMDIzNDggMC4xNjcwMyw2LjAzODY0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwOS0wIgogICAgICAgICBkPSJtIDQ4OS45NzE5OCw0ODIuNjI1NyAzLjgyOTk0LDAgYyAtMC44OTM5MywtNC44Njc1MSAwLjI5OTUzLC01LjMxMjc4IC0xLjQ0NjI2LC0xMC4zNjk4OSAtMC44OTc5NiwtMi42MDEyMiAtMy43NTI1NSwtNi41NzI0IC01LjYxODQzLC04LjEzMDQgMS4yMTgwNCwyLjI2MDE1IDIuMTI5OTQsNC42NjA3OCAyLjcyNzY2LDcuMDkxNzUgMC45ODA5MywzLjk4OTE2IDEuMTEyMTcsNy42OTcyMiAwLjUwNzA5LDExLjQwODU0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMwNy04LTciCiAgICAgICAgIGQ9Im0gNDYzLjg3NTM1LDQ4Mi42MjU3IC0zLjkyOTQyLDAgYyAwLjc4MzY1LC0xLjU5MTM5IDAuMTAxMzgsLTMuMjk2ODYgLTAuMTQ4MDUsLTUuNDc2NiAtMC4yNjc2OSwtMi4zODI3NCAtMy4yODIwMiwtNS45MzA4IC01LjA3OTA4LC03Ljg4MTA3IDIuMzg1NjcsMC43MDY5NiA0Ljc0MTQyLDIuNDM4NTYgNi40NjMzOSw1LjA3ODI5IDEuNTcwNjUsMi40MTQ3NCAyLjU3OTg0LDQuODc1NjIgMi42OTMxNiw4LjI3OTM4IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDMxNS01LTAiCiAgICAgICAgIGQ9Im0gNDM0LjI5MDI3LDQ4Mi42MjU3IC0zLjc0MDAzLDAgYyAtMC4wODY4LC01LjcxMjQgMi44MTk5MiwtOC42MzMwNiA2LjU4Mjc4LC0xMS4zMzI3OCAwLjg0NzY5LC0wLjc4NzU1IDEuNDUyMTEsLTIuMjM1NjIgMS40MDY5OCwtMy43NTUyNyAtMC4wMzc4LC0xLjUyMTU4IC0wLjc0NTU3LC0zLjE3OTMzIC0xLjk5MTA5LC00LjIzNTA2IDEuNDcxNzksMC41MzgwMiAyLjgxOTM0LDEuOTMwMzMgMy40NTY1MiwzLjg0OTI0IDAuNjI5ODcsMS45MjA4NCAwLjUxODkzLDQuMjUyMjYgLTAuNDg5MTEsNi4yNjI0MiAtMC43NTg3MiwxLjQzODA4IC0xLjU5OTQ0LDEuNTI2MTMgLTIuNTE1MTIsMi4zOTk4NiAtMi4zMDQ0MiwxLjExMzI2IC0zLjE0NzQ1LDQuMTg1NjIgLTIuNzEwOTMsNi44MTE1OSBsIDAsMCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMTMtMC0zIgogICAgICAgICBkPSJtIDUyMC41OTM1NCw0ODIuNjI1NyAtMy44NTgwNywwIGMgMC4wNjgzLC0yLjQxNzU4IC0wLjE0NjU0LC00LjY2MTc2IC0wLjY2NTYyLC03LjE1NDI3IC0wLjY5MTY4LC0zLjMyMzkxIC0xLjkzMjUsLTYuNjM0NjcgLTMuNzA5MzEsLTkuNjg0NTIgMi43MDQyMSwxLjkzMDA0IDMuMjUxMTgsNC4yODUwOSA1LjM0NzA5LDcuMzg4OTYgMS41NzA3MywyLjMyNjMxIDEuODQ2MjEsNi41OTMzOSAyLjg4NTkxLDkuNDQ5ODMgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0MzExLTItMiIKICAgICAgICAgZD0ibSA0NzIuMzc2MzcsNDgyLjYyNTcgLTIuOTM1NjksMCBjIDAuMzYyMjMsLTcuNTg4MTQgMi4wNTYxNCwtMTQuMjExOTMgMi44ODg0NiwtMjEuNjg4NjkgMS4xMDMxOCw0LjI5NDYxIDAuNTM2MTIsMTEuMTYwOTMgMC4yMTQyNiwxNS42NTAwNSAtMC4yMDY4NiwyLjg4NTIzIC0wLjc5NTE1LDMuMDIzNDggLTAuMTY3MDMsNi4wMzg2NCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQzMDktNi03IgogICAgICAgICBkPSJtIDQwOS41NjIyMSw0ODIuNjI1NyAtMy44Mjk5NCwwIGMgMC44OTM5MywtNC44Njc1MSAtMC4yOTk1MywtNS4zMTI3OCAxLjQ0NjI2LC0xMC4zNjk4OSAwLjg5Nzk2LC0yLjYwMTIyIDMuNzUyNTQsLTYuNTcyNCA1LjYxODQzLC04LjEzMDQgLTEuMjE4MDQsMi4yNjAxNSAtMi4xMjk5NCw0LjY2MDc4IC0yLjcyNzY2LDcuMDkxNzUgLTAuOTgwOTQsMy45ODkxNiAtMS4xMTIxNyw3LjY5NzIyIC0wLjUwNzA5LDExLjQwODU0IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNTAyLjM2ODc4LDQ4Mi42MjU3IDMuOTI5NDIsMCBjIC0wLjc4MzY1LC0xLjU5MTM5IC0wLjEwMTM4LC0zLjI5Njg2IDAuMTQ4MDUsLTUuNDc2NTkgMC4yNjc2OSwtMi4zODI3NSAzLjI4MjAyLC01LjkzMDgxIDUuMDc5MDgsLTcuODgxMDggLTIuMzg1NjcsMC43MDY5NiAtNC43NDE0MiwyLjQzODU2IC02LjQ2MzM5LDUuMDc4MjkgLTEuNTcwNjUsMi40MTQ3NCAtMi41Nzk4NCw0Ljg3NTYyIC0yLjY5MzE2LDguMjc5MzggeiIKICAgICAgICAgaWQ9InBhdGg0NDc0LTgiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gNDkzLjgzMzg4LDQ4Mi42MjU3IDMuNzQwMDMsMCBjIDAuMDg2OCwtNS43MTI0MSAtMi44MTk5MiwtOC42MzMwNiAtNi41ODI3OCwtMTEuMzMyNzggLTAuODQ3NywtMC43ODc1NSAtMS40NTIxMiwtMi4yMzU2MiAtMS40MDY5OCwtMy43NTUyNyAwLjAzNzgsLTEuNTIxNTggMC43NDU1NywtMy4xNzkzMyAxLjk5MTA5LC00LjIzNTA2IC0xLjQ3MTgsMC41MzgwMiAtMi44MTkzNCwxLjkzMDMzIC0zLjQ1NjUyLDMuODQ5MjQgLTAuNjI5ODcsMS45MjA4NCAtMC41MTg5Myw0LjI1MjI1IDAuNDg5MTEsNi4yNjI0MiAwLjc1ODcyLDEuNDM4MDggMS41OTk0NCwxLjUyNjEyIDIuNTE1MTIsMi4zOTk4NSAyLjMwNDQyLDEuMTEzMjcgMy4xNDc0NSw0LjE4NTYzIDIuNzEwOTMsNi44MTE2IGwgMCwwIHoiCiAgICAgICAgIGlkPSJwYXRoNDQ4NC0yIiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDUwMC40NDgwNyw0ODIuNjI1NyAzLjg1ODA3LDAgYyAtMC4wNjgzLC0yLjQxNzU4IDAuMTQ2NTQsLTQuNjYxNzYgMC42NjU2MiwtNy4xNTQyOCAwLjY5MTY4LC0zLjMyMzkgMS45MzI1LC02LjYzNDY2IDMuNzA5MywtOS42ODQ1MSAtMi43MDQyLDEuOTMwMDQgLTMuMjUxMTcsNC4yODUwOCAtNS4zNDcwOCw3LjM4ODk2IC0xLjU3MDc0LDIuMzI2MzEgLTEuODQ2MjIsNi41OTMzOSAtMi44ODU5MSw5LjQ0OTgzIHoiCiAgICAgICAgIGlkPSJwYXRoNDQ4Ni00IiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIgogICAgICAgICBkPSJtIDUxNy42OTI3Myw0ODIuNjI1NyAyLjkzNTcsMCBjIC0wLjM2MjI0LC03LjU4ODE0IC0yLjA1NjE1LC0xNC4yMTE5MyAtMi44ODg0NiwtMjEuNjg4NjkgLTEuMTAzMTgsNC4yOTQ2MSAtMC41MzYxMywxMS4xNjA5MyAtMC4yMTQyNywxNS42NTAwNSAwLjIwNjg3LDIuODg1MjMgMC43OTUxNiwzLjAyMzQ4IDAuMTY3MDMsNi4wMzg2NCB6IgogICAgICAgICBpZD0icGF0aDQ0ODgtMSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIKICAgICAgICAgZD0ibSA1MjAuOTQ0NDYsNDgyLjYyNTcgMy44Mjk5NCwwIGMgLTAuODkzOTIsLTQuODY3NTEgMC4yOTk1NCwtNS4zMTI3OCAtMS40NDYyNSwtMTAuMzY5ODkgLTAuODk3OTcsLTIuNjAxMjIgLTMuNzUyNTUsLTYuNTcyNCAtNS42MTg0MywtOC4xMzA0IDEuMjE4MDQsMi4yNjAxNSAyLjEyOTk0LDQuNjYwNzggMi43Mjc2NSw3LjA5MTc1IDAuOTgwOTQsMy45ODkxNiAxLjExMjE3LDcuNjk3MjIgMC41MDcwOSwxMS40MDg1NCB6IgogICAgICAgICBpZD0icGF0aDQ0OTAtOSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NTAyLTEiCiAgICAgICAgIGQ9Im0gNDkyLjQ2NTM1LDQ4Mi42MjU3IC0zLjkyOTQyLDAgYyAwLjc4MzY0LC0xLjU5MTM5IDAuMTAxMzgsLTMuMjk2ODYgLTAuMTQ4MDYsLTUuNDc2NiAtMC4yNjc2OSwtMi4zODI3NCAtMy4yODIwMSwtNS45MzA4IC01LjA3OTA3LC03Ljg4MTA3IDIuMzg1NjcsMC43MDY5NiA0Ljc0MTQyLDIuNDM4NTYgNi40NjMzOCw1LjA3ODI5IDEuNTcwNjYsMi40MTQ3NCAyLjU3OTg1LDQuODc1NjIgMi42OTMxNyw4LjI3OTM4IHoiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4NGZmNWU7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNDUxMi00IgogICAgICAgICBkPSJtIDUxMi45MTI3Myw0ODIuNjI1NyAtMy43NDAwMywwIGMgLTAuMDg2OCwtNS43MTI0MSAyLjgxOTkzLC04LjYzMzA2IDYuNTgyNzgsLTExLjMzMjc4IDAuODQ3NywtMC43ODc1NSAxLjQ1MjEyLC0yLjIzNTYyIDEuNDA2OTksLTMuNzU1MjcgLTAuMDM3OCwtMS41MjE1OCAtMC43NDU1OCwtMy4xNzkzMyAtMS45OTExLC00LjIzNTA2IDEuNDcxOCwwLjUzODAyIDIuODE5MzUsMS45MzAzMyAzLjQ1NjUyLDMuODQ5MjQgMC42Mjk4OCwxLjkyMDg0IDAuNTE4OTQsNC4yNTIyNiAtMC40ODkxLDYuMjYyNDIgLTAuNzU4NzIsMS40MzgwOCAtMS41OTk0NCwxLjUyNjEzIC0yLjUxNTEyLDIuMzk5ODUgLTIuMzA0NDIsMS4xMTMyNyAtMy4xNDc0Niw0LjE4NTYzIC0yLjcxMDk0LDYuODExNiBsIDAsMCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ1MTQtMiIKICAgICAgICAgZD0ibSA0MjUuNzg4NDgsNDgyLjYyNTcgLTMuODU4MDgsMCBjIDAuMDY4MywtMi40MTc1OCAtMC4xNDY1NCwtNC42NjE3NiAtMC42NjU2MiwtNy4xNTQyNyAtMC42OTE2OCwtMy4zMjM5MSAtMS45MzI1LC02LjYzNDY3IC0zLjcwOTMsLTkuNjg0NTIgMi43MDQyLDEuOTMwMDQgMy4yNTExOCw0LjI4NTA5IDUuMzQ3MDksNy4zODg5NiAxLjU3MDczLDIuMzI2MzEgMS44NDYyMSw2LjU5MzM5IDIuODg1OTEsOS40NDk4MyB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDQ1MTYtNyIKICAgICAgICAgZD0ibSA0ODQuMjg4OSw0ODIuNjI1NyAtMi45MzU3LDAgYyAwLjM2MjIzLC03LjU4ODE1IDIuMDU2MTUsLTE0LjIxMTkzIDIuODg4NDYsLTIxLjY4ODY5IDEuMTAzMTgsNC4yOTQ2MSAwLjUzNjEzLDExLjE2MDkyIDAuMjE0MjcsMTUuNjUwMDQgLTAuMjA2ODcsMi44ODUyNCAtMC43OTUxNiwzLjAyMzQ5IC0wLjE2NzAzLDYuMDM4NjUgeiIKICAgICAgICAgc3R5bGU9ImZpbGw6Izg0ZmY1ZTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2U6bm9uZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGg0NTE4LTQiCiAgICAgICAgIGQ9Im0gNDUwLjA2NDcsNDgyLjYyNTcgLTMuODI5OTQsMCBjIDAuODkzOTIsLTQuODY3NTEgLTAuMjk5NTQsLTUuMzEyNzggMS40NDYyNSwtMTAuMzY5ODkgMC44OTc5NywtMi42MDEyMiAzLjc1MjU1LC02LjU3MjQgNS42MTg0MywtOC4xMzA0IC0xLjIxODA0LDIuMjYwMTUgLTIuMTI5OTQsNC42NjA3OCAtMi43Mjc2NSw3LjA5MTc1IC0wLjk4MDk0LDMuOTg5MTYgLTEuMTEyMTcsNy42OTcyMiAtMC41MDcwOSwxMS40MDg1NCB6IgogICAgICAgICBzdHlsZT0iZmlsbDojODRmZjVlO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZTpub25lIiAvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==";

// =============================================================
// MAIN APPLICATION
// =============================================================
class FlowerBloomApp {
    constructor() {
        // DOM
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('webcam');
        this.loadingEl = document.getElementById('loading');
        this.instructionsEl = document.getElementById('instructions');
        this.statusEl = document.getElementById('status');
        this.demoButton = document.getElementById('demoButton');
        this.cameraButton = document.getElementById('cameraButton');
        this.demoMode = true;
        this.cameraStarted = false;
        this.cameraController = null;
        this.bloomCooldownUntil = 0;
        this.lastOpenPalmAt = 0;
        this.openPalmWasOpen = false;
        this.lastRenderTimestamp = 0;
        this.frameInterval = 1000 / 30;
        this.dynamicPlants = [];

        // Noise
        this.noise = new OrganicNoise();

        // Time
        this.time = 0;
        this.lastTimestamp = 0;

        // Gesture state (smoothed values)
        this.bloom = 0;
        this.growth = 0;
        this.colorPos = 0;

        // Gesture targets (raw from detection)
        this.targetBloom = 0;
        this.targetGrowth = 0;
        this.targetColorPos = 0;

        // Flower colors selected directly by the stable left-hand finger count.
        this.colorPalette = [
            { name: '紫色', hue: 275, sat: 65, light: 68 },
            { name: '黄色', hue: 48, sat: 86, light: 62 },
            { name: '粉色', hue: 335, sat: 74, light: 70 },
            { name: '红色', hue: 0, sat: 76, light: 62 },
            { name: '蓝色', hue: 215, sat: 68, light: 67 }
        ];

        // Stable left-hand finger-count selection; count N maps to palette[N - 1].
        this.pendingFingerCount = null;
        this.pendingFingerCountSince = 0;
        this.pendingFingerCountFrames = 0;
        this.stableFingerCount = null;
        this.colorIndex = 0;

        // Hand landmarks (updated each frame by MediaPipe)
        this.handLandmarks = [];
        this.handHandedness = [];
        this.handsDetected = 0;

        // Particles
        this.particles = [];
        this.fallingPetals = [];

        // Fireflies (jugnus)
        this.fireflies = [];

        // Floating romantic heart particles
        this.hearts = [];

        // Golden sparkle dust — regular dust motes, bright flares, and diagonal
        // stream clusters all live together in this one array (see initSparkles())
        this.sparkles = [];

        // Ground grass artwork, loaded once and tiled along the bottom edge
        this.grassImg = new Image();
        this.grassImg.src = 'data:image/svg+xml;base64,' + GRASS_SVG_BASE64;

        // Garden layout — several flower plants spread across the scene.
        // Each has its own horizontal position, height, size, branch count,
        // and a phase offset so they don't all sway in perfect unison.
        this.gardenPlants = [
            { xRatio: 0.10, heightRatio: 0.24, scaleMul: 0.45, phase: 0.0, branchCount: 1 },
            { xRatio: 0.27, heightRatio: 0.30, scaleMul: 0.60, phase: 1.9, branchCount: 2 },
            { xRatio: 0.47, heightRatio: 0.35, scaleMul: 0.75, phase: 3.6, branchCount: 3 },
            { xRatio: 0.75, heightRatio: 0.45, scaleMul: 1.00, phase: 0.0, branchCount: 4 }, // original hero flower
            { xRatio: 0.90, heightRatio: 0.27, scaleMul: 0.50, phase: 5.2, branchCount: 1 }
        ];

        // Setup
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initParticles();
        this.initFireflies();
        this.initHearts();
        this.initSparkles();
        this.targetGrowth = 0.82;
        this.growth = 0.82;
        this.targetBloom = 0.76;
        this.bindControls();
        this.setStatus('演示模式 · 点击画面种下花朵');
        setTimeout(() => this.loadingEl?.classList.add('hidden'), 900);

        // Hide instructions after 8 seconds
        setTimeout(() => {
            this.instructionsEl?.classList.add('hidden');
        }, 8000);

        // Kick off render
        requestAnimationFrame((ts) => this.animate(ts));
    }

    bindControls() {
        this.cameraButton?.addEventListener('click', () => this.startCamera());
        this.demoButton?.addEventListener('click', () => {
            this.demoMode = !this.demoMode;
            this.demoButton.textContent = `演示模式：${this.demoMode ? '开' : '关'}`;
            this.targetGrowth = this.demoMode ? 0.82 : (this.handsDetected ? this.targetGrowth : 0.35);
            this.setStatus(this.demoMode ? '演示模式 · 点击画面种下花朵' : '手势模式 · 左手控制开合，右手控制生长');
        });
        document.getElementById('clearButton')?.addEventListener('click', () => {
            this.gardenPlants = [];
            this.dynamicPlants = [];
            this.targetGrowth = this.growth = 0;
            this.setStatus('花园已清空 · 点击画面重新种花');
        });
        this.canvas.addEventListener('pointerdown', (event) => {
            if (!this.demoMode && this.cameraStarted) return;
            const rect = this.canvas.getBoundingClientRect();
            const xRatio = Math.max(0.04, Math.min(0.96, 1 - (event.clientX - rect.left) / rect.width));
            const heightRatio = 0.22 + Math.random() * 0.18;
            this.dynamicPlants.push({ xRatio, heightRatio, scaleMul: 0.48 + Math.random() * 0.32, phase: Math.random() * 8, branchCount: 1 });
            this.targetGrowth = Math.max(this.targetGrowth, 0.78);
            this.setStatus('新花已种下 · 捏合手指，感受花朵开合');
        });
    }

    setStatus(message, flash = false) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
        this.statusEl.classList.toggle('flash', flash);
        if (flash) setTimeout(() => this.statusEl?.classList.remove('flash'), 850);
    }

    // ---------------------------------------------------------
    // Setup
    // ---------------------------------------------------------
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.canvas.width = Math.round(window.innerWidth * dpr);
        this.canvas.height = Math.round(window.innerHeight * dpr);
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        // Re-bound particles
        for (const p of this.particles) {
            p.cw = this.canvasWidth;
            p.ch = this.canvasHeight;
        }

        // Re-bound fireflies
        for (const f of this.fireflies) {
            f.cw = this.canvasWidth;
            f.ch = this.canvasHeight;
        }

        // Re-bound hearts
        for (const h of this.hearts) {
            h.cw = this.canvasWidth;
            h.ch = this.canvasHeight;
        }

        // Re-bound sparkles
        for (const s of this.sparkles) {
            s.cw = this.canvasWidth;
            s.ch = this.canvasHeight;
        }
    }

    initParticles() {
        const count = 60;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(this.canvasWidth, this.canvasHeight));
        }
    }

    initFireflies() {
        const count = 16;
        for (let i = 0; i < count; i++) {
            this.fireflies.push(new Firefly(this.canvasWidth, this.canvasHeight));
        }
    }

    initHearts() {
        const count = 22;
        for (let i = 0; i < count; i++) {
            this.hearts.push(new HeartParticle(this.canvasWidth, this.canvasHeight));
        }
    }

    // Builds the full golden sparkle layer: plain dust motes, bold flare dots,
    // and a handful of diagonal "stream" clusters (tight trails of dust),
    // mirroring the composition of the reference sparkle-dust image.
    initSparkles() {
        const cw = this.canvasWidth;
        const ch = this.canvasHeight;

        // ---- Plain drifting dust motes ----
        const dustCount = 90; // how many tiny background sparkles to scatter around
        for (let i = 0; i < dustCount; i++) {
            // false = not a flare, so this constructs a small, dim dust speck
            this.sparkles.push(new GoldenSparkle(cw, ch, false));
        }

        // ---- Bold "flare" sparkles ----
        const flareCount = 10; // fewer of these since they're meant to stand out
        for (let i = 0; i < flareCount; i++) {
            // true = flare, so this constructs a bigger, brighter glowing dot
            this.sparkles.push(new GoldenSparkle(cw, ch, true));
        }

        // ---- Diagonal stream clusters (the trailing dust streaks in the reference art) ----
        const streamCount = 4;          // how many diagonal trails to place on screen
        const perStream = 16;           // how many small sparkles make up each trail
        for (let s = 0; s < streamCount; s++) {
            // Random starting point for this stream's diagonal line
            const startX = Math.random() * cw;
            const startY = Math.random() * ch;
            // Random direction (in radians) so different streams point different ways
            const angle = Math.random() * Math.PI * 2;
            // Random total length of the stream line, in pixels
            const length = 120 + Math.random() * 260;

            for (let p = 0; p < perStream; p++) {
                // t = how far along the line this sparkle sits, from 0 (start) to 1 (end)
                const t = p / perStream;
                // Base position along the straight line at fraction t
                const lineX = startX + Math.cos(angle) * length * t;
                const lineY = startY + Math.sin(angle) * length * t;

                // Perpendicular jitter so sparkles scatter slightly off the exact
                // line, which reads as an organic dust trail rather than a ruled line
                const perpAngle = angle + Math.PI / 2; // 90° offset from the stream direction
                const jitter = (Math.random() - 0.5) * 30; // random sideways offset amount
                const jitterX = Math.cos(perpAngle) * jitter;
                const jitterY = Math.sin(perpAngle) * jitter;

                // Construct the sparkle pinned to this jittered point on the stream line
                this.sparkles.push(
                    new GoldenSparkle(cw, ch, false, { x: lineX + jitterX, y: lineY + jitterY })
                );
            }
        }
    }

    async startCamera() {
        if (this.cameraStarted) {
            this.setStatus('摄像头已开启 · 左手捏合开花，右手控制生长');
            return;
        }
        if (!window.Hands || !window.Camera) {
            this.setStatus('手部识别资源未加载，请确认网络后刷新页面');
            return;
        }
        const hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((r) => this.onHandResults(r));

        const cam = new Camera(this.video, {
            onFrame: async () => {
                await hands.send({ image: this.video });
            },
            width: 1280,
            height: 720,
        });

        try {
            await cam.start();
            this.cameraStarted = true;
            this.cameraController = cam;
            this.demoMode = false;
            this.demoButton.textContent = '演示模式：关';
            this.cameraButton.textContent = '摄像头已开启';
            this.video.classList.add('is-live');
            this.setStatus('手势模式 · 左手捏合开花，右手控制生长');
            setTimeout(() => this.loadingEl?.classList.add('hidden'), 500);
        } catch (error) {
            console.warn('Camera could not start:', error);
            this.setStatus('摄像头不可用 · 可开启演示模式并点击画面种花');
            this.loadingEl?.classList.add('hidden');
        }
    }

    // ---------------------------------------------------------
    // Hand results callback
    // ---------------------------------------------------------
    onHandResults(results) {
        this.handLandmarks = results.multiHandLandmarks || [];
        // Hands receives the unmirrored video pixels; the UI mirror is CSS only.
        // MediaPipe Hands assumes mirrored input, so normalize labels for the real hands.
        this.handHandedness = (results.multiHandedness || []).map((hand) => ({
            ...hand,
            label: hand.label === 'Left' ? 'Right' : hand.label === 'Right' ? 'Left' : hand.label,
        }));
        this.handsDetected = this.handLandmarks.length;

        let leftPinch = 0;
        let rightPinch = 0;
        let hasLeft = false;
        let hasRight = false;
        let openPalm = false;

        if (this.handsDetected > 0) {
            for (let i = 0; i < this.handsDetected; i++) {
                const hand = this.handLandmarks[i];
                const handedness = this.handHandedness[i];
                const reliableHand = handedness && (handedness.score === undefined || handedness.score >= 0.6);
                const isLeft = reliableHand && handedness.label === 'Left';
                const isRight = reliableHand && handedness.label === 'Right';
                const pinch = this.calcPinchDistance(hand);
                const palmOpen = this.isOpenPalm(hand);
                if (palmOpen) openPalm = true;

                if (isLeft) {
                    leftPinch = pinch;
                    hasLeft = true;
                    this.updateColorFromFingerCount(this.countExtendedFingers(hand), performance.now());
                } else if (isRight) {
                    rightPinch = pinch;
                    hasRight = true;
                }
            }

            if (!hasLeft) this.resetPendingFingerCount();

            // Left hand controls Bloom
            this.targetBloom = hasLeft ? leftPinch : 0;

            // Right hand controls Growth
            this.targetGrowth = hasRight ? rightPinch : (this.demoMode ? 0.82 : 0);
            const now = performance.now();
            if (openPalm) this.targetBloom = Math.max(this.targetBloom, 0.96);
            if (openPalm && !this.openPalmWasOpen && now > this.bloomCooldownUntil) {
                this.lastOpenPalmAt = now;
                this.bloomCooldownUntil = now + 2200;
                this.targetBloom = 1;
                this.bloom = Math.max(this.bloom, 0.48);
                this.setStatus('花朵正在指尖绽放 · 再次触发请稍等', true);
                this.spawnPetalBurst();
            }
            this.openPalmWasOpen = openPalm;
        } else {
            this.resetPendingFingerCount();
            this.targetBloom *= 0.94;
            this.targetGrowth *= 0.94;
            this.openPalmWasOpen = false;
        }
    }

    isOpenPalm(lm) {
        const wrist = lm[0];
        const pairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
        let extended = 0;
        for (const [tip, pip] of pairs) {
            const tipDistance = Math.hypot(lm[tip].x - wrist.x, lm[tip].y - wrist.y);
            const pipDistance = Math.hypot(lm[pip].x - wrist.x, lm[pip].y - wrist.y);
            if (tipDistance > pipDistance * 1.13) extended++;
        }
        const thumbOpen = Math.hypot(lm[4].x - lm[0].x, lm[4].y - lm[0].y) > Math.hypot(lm[3].x - lm[0].x, lm[3].y - lm[0].y) * 1.08;
        return extended >= 4 && thumbOpen;
    }

    spawnPetalBurst() {
        const cw = this.canvasWidth;
        const ch = this.canvasHeight;
        for (let i = 0; i < 18; i++) {
            const particle = new PetalParticle(cw, ch);
            particle.x = cw * (0.35 + Math.random() * 0.4);
            particle.y = ch * (0.28 + Math.random() * 0.28);
            particle.vy = -0.5 - Math.random() * 1.5;
            this.fallingPetals.push(particle);
        }
    }

    /** Count extended fingers using 3D landmark geometry instead of palm orientation. */
    countExtendedFingers(lm) {
        if (!Array.isArray(lm) || lm.length < 21) return null;
        for (const point of lm) {
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        }
        const point3 = (index) => ({ x: lm[index].x, y: lm[index].y, z: Number.isFinite(lm[index].z) ? lm[index].z : 0 });
        const vector = (from, to) => {
            const a = point3(from), b = point3(to);
            return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        };
        const length = (v) => Math.hypot(v.x, v.y, v.z);
        const distance = (a, b) => length(vector(a, b));
        const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
        const isStraightAndExtended = (mcp, pip, tip) => {
            const proximal = vector(mcp, pip);
            const distal = vector(pip, tip);
            const proximalLength = length(proximal);
            const distalLength = length(distal);
            if (proximalLength < 0.015 || distalLength < 0.015) return null;
            const alignment = dot(proximal, distal) / (proximalLength * distalLength);
            const reach = distance(mcp, tip) / proximalLength;
            return alignment > 0.2 && reach > 1.12;
        };

        const palmWidth = distance(5, 17);
        if (palmWidth < 0.025) return null;
        let count = 0;
        for (const [mcp, pip, tip] of [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]]) {
            const extended = isStraightAndExtended(mcp, pip, tip);
            if (extended === null) return null;
            if (extended) count++;
        }

        const thumbAlignment = isStraightAndExtended(2, 3, 4);
        if (thumbAlignment === null) return null;
        const thumbExtendsFromPalm = distance(4, 5) - distance(3, 5) > palmWidth * 0.12;
        if (thumbAlignment && thumbExtendsFromPalm) count++;
        return count;
    }

    /** Require a stable count before selecting its exact palette entry. */
    updateColorFromFingerCount(count, now) {
        if (!Number.isInteger(count) || count < 0 || count > 5) {
            this.resetPendingFingerCount();
            return;
        }
        if (count !== this.pendingFingerCount) {
            this.pendingFingerCount = count;
            this.pendingFingerCountSince = now;
            this.pendingFingerCountFrames = 1;
            return;
        }
        this.pendingFingerCountFrames++;
        if (this.pendingFingerCountFrames < 5 || now - this.pendingFingerCountSince < 260) return;
        if (this.stableFingerCount === count) return;

        this.stableFingerCount = count;
        if (count === 0) return;
        this.colorIndex = count - 1;
        this.targetColorPos = this.colorIndex;
        this.colorPos = this.colorIndex;
    }

    resetPendingFingerCount() {
        this.pendingFingerCount = null;
        this.pendingFingerCountSince = 0;
        this.pendingFingerCountFrames = 0;
    }

    /**
     * Pinch distance: distance between thumb tip (4) and index fingertip (8),
     * normalized by hand size so it works at any distance from the camera.
     * Returns 0 (pinched) → 1 (fully spread).
     */
    calcPinchDistance(lm) {
        const thumb = lm[4];   // thumb tip
        const index = lm[8];   // index fingertip
        const wrist = lm[0];
        const mcp = lm[9];     // middle-finger MCP

        // Reference = wrist-to-MCP distance (scales with hand size in frame)
        const ref = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        if (ref < 0.01) return 0;

        const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        // Normalize: pinch ~0 when touching, ~1 when spread wide
        return Math.min(1, Math.max(0, (dist / ref - 0.15) * 1.6));
    }

    /** Rough palm center (average of wrist + MCP joints) */
    palmCenter(lm) {
        const ids = [0, 5, 9, 13, 17];
        let x = 0, y = 0;
        for (const i of ids) { x += lm[i].x; y += lm[i].y; }
        return { x: x / ids.length, y: y / ids.length };
    }

    /** Blend between adjacent palette stops based on this.colorPos */
    getCurrentPetalColor() {
        const palette = this.colorPalette;
        const n = palette.length;
        const pos = Math.max(0, Math.min(n - 1, this.colorPos));
        const i0 = Math.floor(pos);
        const i1 = Math.min(n - 1, i0 + 1);
        const t = pos - i0;
        const a = palette[i0];
        const b = palette[i1];
        return {
            hue: a.hue + (b.hue - a.hue) * t,
            sat: a.sat + (b.sat - a.sat) * t,
            light: a.light + (b.light - a.light) * t
        };
    }

    /** Name of the palette color closest to the current position */
    getNearestColorName() {
        const idx = Math.round(Math.max(0, Math.min(this.colorPalette.length - 1, this.colorPos)));
        return this.colorPalette[idx].name;
    }

    // =============================================================
    // RENDERING
    // =============================================================

    // ----- Ground grass (tiled artwork along the bottom edge) -----
    drawGrass(cw, ch) {
        const img = this.grassImg;
        if (!img || !img.complete || !img.naturalWidth) return;

        const ctx = this.ctx;
        const aspect = img.naturalWidth / img.naturalHeight;
        // Bigger grass: sized to read as knee-height in frame rather than ankle-height
        const tileH = ch * 0.26;
        const tileW = tileH * aspect;
        const step = tileW * 0.68; // overlap tiles so there are no gaps
        const count = Math.ceil(cw / step) + 2;

        // Number of horizontal slices used to fake a non-rigid bend. More slices =
        // smoother curve but more drawImage calls, so this is a balance point.
        const strips = 10;
        const stripSrcH = img.naturalHeight / strips; // source slice height (in image px)
        const stripDestH = tileH / strips;             // destination slice height (on screen)

        for (let i = -1; i < count; i++) {
            // Deterministic pseudo-random jitter per tile index (stable across frames)
            const seedA = Math.sin(i * 12.9898) * 43758.5453;
            const randA = seedA - Math.floor(seedA);
            const seedB = Math.sin(i * 78.233) * 43758.5453;
            const randB = seedB - Math.floor(seedB);

            const flip = randA > 0.5 ? -1 : 1;
            const scaleVar = 0.85 + randB * 0.4;
            // IMPORTANT: only ever push the tile's base DOWN (never up). A negative
            // jitter here would lift the tile's planted point above the canvas's
            // bottom edge, leaving a visible gap of background showing through
            // beneath it — that was the bug causing the strip of daylight at the
            // very bottom of the frame. Clamping to >= 0 guarantees every tile's
            // base sits at or below the true ground line, fully sealing the edge.
            const yJitter = randA * tileH * 0.12;
            const baseX = i * step + (randB - 0.5) * step * 0.5;

            // Gentle sway, offset per tile so it doesn't move as one solid block.
            // This is now a BEND amount (in radians-equivalent), not a rigid rotation —
            // it drives how far the tip shears sideways relative to the tile height.
            const bendAmount = this.noise.get(this.time * 0.5 + i * 0.7, 6) * 0.05;

            ctx.save();
            ctx.translate(baseX + tileW / 2, ch + yJitter);
            ctx.scale(flip * scaleVar, scaleVar);
            ctx.globalAlpha = 0.9;

            // Draw the blade in horizontal strips, from base (bottom, no shift) to
            // tip (top, maximum shift). The base stays visually planted at y=0 while
            // only the upper strips shear sideways, with the offset growing on a
            // curve (power > 1) so the bend accelerates toward the tip like a real
            // blade of grass, instead of the whole clump rotating as one rigid piece.
            for (let s = 0; s < strips; s++) {
                const fracFromBase = 1 - (s + 0.5) / strips; // 0 at base, ~1 at tip
                const bendCurve = Math.pow(fracFromBase, 2.2);
                const xShift = bendCurve * bendAmount * tileH;

                const srcY = s * stripSrcH;
                const destY = -tileH + s * stripDestH;

                ctx.drawImage(
                    img,
                    0, srcY, img.naturalWidth, stripSrcH,           // source slice
                    -tileW / 2 + xShift, destY, tileW, stripDestH + 0.5 // dest slice (+0.5 avoids hairline gaps)
                );
            }

            ctx.restore();
        }
    }

    // ----- Hand Skeleton -----
    drawHandSkeleton(lm, handedness) {
        const ctx = this.ctx;
        const cw = this.canvasWidth;
        const ch = this.canvasHeight;

        // Draw guide line between thumb tip (4) and index fingertip (8)
        const thumbTip = lm[4];
        const indexTip = lm[8];
        if (thumbTip && indexTip) {
            const tx = thumbTip.x * cw;
            const ty = thumbTip.y * ch;
            const ix = indexTip.x * cw;
            const iy = indexTip.y * ch;

            const isLeft = handedness && handedness.label === 'Left';
            const labelText = isLeft ? '✿ Left Hand: Bloom' : '🌱 Right Hand: Grow';
            const glowColor = isLeft ? 'rgba(255, 80, 130, 0.85)' : 'rgba(56, 193, 114, 0.85)';
            const strokeStyle = isLeft ? '#ff5082' : '#38c172';

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = strokeStyle;
            ctx.shadowBlur = 8;
            ctx.shadowColor = glowColor;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ix, iy);
            ctx.stroke();
            ctx.restore();

            // Draw glowing circles at thumb and index tips
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = glowColor;
            ctx.fillStyle = strokeStyle;
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI * 2);
            ctx.arc(ix, iy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw unmirrored text label at the midpoint
            const midX = (tx + ix) / 2;
            const midY = (ty + iy) / 2;

            ctx.save();
            // Counter-flip coordinates on X around the canvas center to make text unmirrored
            ctx.translate(cw, 0);
            ctx.scale(-1, 1);

            ctx.font = 'bold 12px Inter, sans-serif';
            const textWidth = ctx.measureText(labelText).width;
            const paddingX = 10;
            const paddingY = 6;
            const pillWidth = textWidth + paddingX * 2;
            const pillHeight = 22;

            const drawX = cw - midX;
            const drawY = midY - 20; // draw slightly above the midpoint

            // Draw background pill
            ctx.fillStyle = 'rgba(10, 5, 20, 0.8)';
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 6;
            ctx.shadowColor = glowColor;
            ctx.beginPath();
            ctx.roundRect(drawX - pillWidth / 2, drawY - pillHeight / 2, pillWidth, pillHeight, 6);
            ctx.fill();
            ctx.stroke();

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, drawX, drawY);

            ctx.restore();
        }
    }

    // ----- Stem -----
    drawStem(baseX, baseY, height, phase = 0) {
        const ctx = this.ctx;
        const segs = 24;
        const segH = height / segs;

        // Build stem path points
        const pts = [{ x: baseX, y: baseY }];
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const sway = this.noise.get(this.time * 0.6 + phase + i * 0.25, 0) * 10 * t;
            pts.push({
                x: baseX + sway,
                y: baseY - segH * i,
            });
        }

        // Draw stem (thick gradient line)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(40, 120, 35, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(80, 180, 60, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Core stem
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#3a8a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Leaves
        this.drawLeaves(pts, phase);

        ctx.restore();

        return { tip: pts[pts.length - 1], pts };
    }

    drawLeaves(stemPts, phase = 0) {
        const ctx = this.ctx;
        const positions = [0.25, 0.45, 0.65];

        for (let li = 0; li < positions.length; li++) {
            const idx = Math.floor(positions[li] * (stemPts.length - 1));
            const pt = stemPts[idx];
            const side = li % 2 === 0 ? 1 : -1;
            const len = 22 + this.growth * 18;
            const angle = side * (0.45 + this.noise.get(this.time * 0.6 + phase + li * 3, 2) * 0.2);

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);

            const grad = ctx.createLinearGradient(0, 0, len, 0);
            grad.addColorStop(0, 'rgba(55, 140, 45, 0.8)');
            grad.addColorStop(1, 'rgba(75, 170, 60, 0.4)');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(80, 200, 60, 0.25)';

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.5, -10, len, -1);
            ctx.quadraticCurveTo(len * 0.5, 10, 0, 0);
            ctx.fill();

            // Leaf vein
            ctx.strokeStyle = 'rgba(90, 180, 70, 0.3)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(len * 0.8, 0);
            ctx.stroke();

            ctx.restore();
        }
    }

    // ----- Flower Head (Tulip facing upward) -----
    drawFlowerHead(cx, cy, bloom, scale, phase = 0) {
        // Boost scale as it blooms to make it feel more dynamic and organic
        const bloomScaleFactor = 1.0 + bloom * 0.18;
        const adjustedScale = scale * bloomScaleFactor;
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(cx, cy);

        // Keep palette colors on the petals instead of tinting the background.
        const { hue, sat, light } = this.getCurrentPetalColor();

        const maxPetalLen = 85 * adjustedScale;
        // Two soft petal rings unfurl from a compact bud into a rounded flower.
        const centerY = -maxPetalLen * 0.36;
        const layers = [
            { count: 9, length: maxPetalLen * 0.72, width: maxPetalLen * 0.25, radius: maxPetalLen * 0.08, offset: 0.12, hue: 10, light: 7 },
            { count: 7, length: maxPetalLen * 0.58, width: maxPetalLen * 0.23, radius: maxPetalLen * 0.04, offset: 0.34, hue: -14, light: 14 }
        ];
        const petalFamilies = [
            { hue: 340, sat: 52, light: 81 }, // rose pink
            { hue: 38, sat: 34, light: 91 },  // milk cream
            { hue: 275, sat: 43, light: 83 }, // pale lavender
            { hue: 25, sat: 56, light: 84 }   // soft apricot
        ];
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            const layer = layers[layerIndex];
            for (let i = 0; i < layer.count; i++) {
                const fan = (i / layer.count) * Math.PI * 2 * bloom;
                const flutter = this.noise.get(this.time * 1.1 + phase + i * 0.7, layerIndex + 2) * 0.035;
                const angle = fan + layer.offset + flutter;
                const family = petalFamilies[(i + layerIndex * 2) % petalFamilies.length];
                const petalHue = hue + layer.hue + ((family.hue - 340 + 540) % 360 - 180) * 0.04;
                const petalSat = sat * 0.82 + family.sat * 0.18;
                const petalLight = light * 0.82 + family.light * 0.18;
                ctx.save();
                ctx.translate(Math.cos(angle) * layer.radius * bloom, centerY + Math.sin(angle) * layer.radius * bloom);
                this.drawTulipPetal(ctx, angle, layer.length * (0.88 + 0.12 * Math.sin(i * 3.1)), layer.width * (0.9 + 0.1 * Math.cos(i)), petalHue, petalSat, petalLight + layer.light, bloom);
                ctx.restore();
            }
        }

        // Warm pollen center with fine filaments and luminous anthers.
        if (bloom > 0.15) {
            ctx.save();
            ctx.translate(0, centerY);
            ctx.shadowBlur = 14 * bloom;
            ctx.shadowColor = 'rgba(255, 211, 130, .65)';
            const core = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9 * adjustedScale);
            core.addColorStop(0, `rgba(255, 248, 213, ${bloom})`);
            core.addColorStop(1, `rgba(224, 151, 90, ${bloom})`);
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(0, 0, 7 * adjustedScale, 0, Math.PI * 2);
            ctx.fill();
            const stamenCount = 10;
            for (let i = 0; i < stamenCount; i++) {
                const a = (i / stamenCount) * Math.PI * 2 + this.time * 0.16 + phase;
                const r = 12 * adjustedScale * bloom;
                const sx = Math.cos(a) * r;
                const sy = Math.sin(a) * r;
                ctx.strokeStyle = `rgba(255, 225, 167, ${bloom * 0.72})`;
                ctx.lineWidth = 0.8 * adjustedScale;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
                ctx.lineTo(sx, sy);
                ctx.stroke();
                ctx.fillStyle = `rgba(255, 239, 188, ${bloom})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.8 * adjustedScale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    drawTulipPetal(ctx, angle, length, width, hue, sat, light, bloom) {
        ctx.save();
        ctx.rotate(angle);

        // Gradient from base (darker/coral) to top (bright pink/yellow)
        const grad = ctx.createLinearGradient(-width, 0, width * 0.5, -length);
        grad.addColorStop(0, `hsla(${hue + 22}, ${sat}%, ${light - 8}%, 0.82)`);
        grad.addColorStop(0.48, `hsla(${hue}, ${sat}%, ${light + 4}%, 0.88)`);
        grad.addColorStop(0.86, `hsla(${hue - 8}, ${sat + 4}%, ${Math.min(light + 15, 96)}%, 0.88)`);
        grad.addColorStop(1, `hsla(${hue - 18}, ${sat + 7}%, ${Math.min(light + 19, 98)}%, 0.78)`);

        ctx.fillStyle = grad;
        // Avoid a colored shadow spilling the petal color onto the scene.
        ctx.shadowBlur = 0;

        // Tulip petal shape pointing straight up (-Y direction)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            -width * 1.2, -length * 0.25,
            -width * 0.88, -length * 0.88,
            width * 0.06, -length
        );
        ctx.bezierCurveTo(
            width * 1.06, -length * 0.84,
            width * 1.16, -length * 0.26,
            0, 0
        );
        ctx.fill();

        // Subtle petal vein
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${hue + 15}, ${sat}%, ${light + 15}%, 0.25)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length * 0.85);
        ctx.stroke();

        ctx.restore();
    }

    // ----- Side Branches -----
    drawBranch(startX, startY, baseAngle, length, scale, phase = 0) {
        const ctx = this.ctx;
        const segs = 12;
        const segL = length / segs;
        const pts = [{ x: startX, y: startY }];

        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const sway = this.noise.get(this.time * 0.8 + phase + i * 0.3, 5) * 4 * t;
            const angle = baseAngle + sway * 0.01;

            pts.push({
                x: pts[pts.length - 1].x + Math.cos(angle) * segL,
                y: pts[pts.length - 1].y + Math.sin(angle) * segL
            });
        }

        // Draw the branch stem
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow
        ctx.lineWidth = 4 * scale;
        ctx.strokeStyle = 'rgba(40, 120, 35, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(80, 180, 60, 0.25)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Core branch
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = '#3a8a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.restore();

        // Draw a leaf on the branch
        this.drawBranchLeaves(pts, scale, phase);

        return pts[pts.length - 1]; // return branch tip
    }

    drawBranchLeaves(branchPts, scale, phase = 0) {
        const ctx = this.ctx;
        if (branchPts.length < 5) return;
        
        // Leaf in the middle of the branch
        const midIdx = Math.floor(branchPts.length * 0.5);
        const pt = branchPts[midIdx];
        const prevPt = branchPts[midIdx - 1];
        if (!pt || !prevPt) return;
        
        const angle = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x) + Math.PI / 2;
        const len = 12 * scale * (1 + this.growth);

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, 'rgba(55, 140, 45, 0.8)');
        grad.addColorStop(1, 'rgba(75, 170, 60, 0.4)');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -5, len, -1);
        ctx.quadraticCurveTo(len * 0.5, 5, 0, 0);
        ctx.fill();

        ctx.restore();
    }

    // ----- One plant in the garden (stem + branches + flower heads) -----
    drawPlant(config, cw, ch) {
        const stemBaseX = cw * config.xRatio;
        const stemBaseY = ch * 0.95;
        const stemH = ch * config.heightRatio * this.growth;
        const flowerScale = 1.25 * config.scaleMul * this.growth;
        const phase = config.phase;

        const stemData = this.drawStem(stemBaseX, stemBaseY, stemH, phase);
        const tip = stemData.tip;
        const pts = stemData.pts;

        // Branch layout, reused across plants and trimmed to branchCount
        const allBranchConfigs = [
            { heightRatio: 0.3,  direction: -1, lengthFactor: 0.16, scaleFactor: 0.42 },
            { heightRatio: 0.45, direction: 1,  lengthFactor: 0.14, scaleFactor: 0.45 },
            { heightRatio: 0.6,  direction: -1, lengthFactor: 0.12, scaleFactor: 0.48 },
            { heightRatio: 0.75, direction: 1,  lengthFactor: 0.1,  scaleFactor: 0.4 }
        ];
        const branchConfigs = allBranchConfigs.slice(0, config.branchCount);

        for (const bc of branchConfigs) {
            const idx = Math.floor(pts.length * bc.heightRatio);
            if (idx > 0 && idx < pts.length) {
                const pt = pts[idx];
                const prevPt = pts[idx - 1] || pt;
                const tangent = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x);

                const branchAngle = tangent + (bc.direction * 0.75);
                const branchLength = ch * bc.lengthFactor * this.growth * config.scaleMul;

                const branchTip = this.drawBranch(pt.x, pt.y, branchAngle, branchLength, this.growth, phase);
                const subFlowerScale = flowerScale * bc.scaleFactor;

                this.drawFlowerHead(branchTip.x, branchTip.y, this.bloom, subFlowerScale, phase);
            }
        }

        // Main flower head for this plant
        this.drawFlowerHead(tip.x, tip.y, this.bloom, flowerScale, phase);
    }

    // ----- HUD Overlay -----
    drawHUD() {
        const ctx = this.ctx;
        const cw = this.canvasWidth;

        ctx.save();

        // Counter-flip to undo the CSS scaleX(-1) so text is readable
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);

        ctx.font = '600 15px Inter, sans-serif';
        ctx.textAlign = 'left';

        // Position in screen-space top-right (which is canvas top-left after flip)
        const px = 20;
        const py = 22;

        // Background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(px - 10, py - 14, 138, 78, 10);
        ctx.fill();

        // Bloom
        ctx.fillStyle = 'rgba(255, 170, 200, 0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 100, 150, 0.4)';
        ctx.fillText(`Bloom: ${this.bloom.toFixed(2)}`, px, py + 6);

        // Growth
        ctx.fillStyle = 'rgba(140, 255, 140, 0.95)';
        ctx.shadowColor = 'rgba(80, 255, 80, 0.4)';
        ctx.fillText(`Grow: ${this.growth.toFixed(2)}`, px, py + 28);

        // Color
        const { hue, sat, light } = this.getCurrentPetalColor();
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${Math.min(light + 10, 92)}%, 0.95)`;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.4)`;
        ctx.fillText(`Color: ${this.getNearestColorName()}`, px, py + 50);

        ctx.restore();
    }

    // =============================================================
    // ANIMATION LOOP
    // =============================================================
    animate(timestamp) {
        if (this.lastRenderTimestamp && timestamp - this.lastRenderTimestamp < this.frameInterval) {
            requestAnimationFrame((ts) => this.animate(ts));
            return;
        }
        const dt = this.lastTimestamp ? Math.min(2, (timestamp - this.lastTimestamp) / 16.67) : 1;
        this.lastRenderTimestamp = timestamp;
        this.lastTimestamp = timestamp;
        this.time += 0.016 * dt;

        const ctx = this.ctx;
        const cw = this.canvasWidth;
        const ch = this.canvasHeight;

        // ---- Smooth interpolation ----
        const lerpSpeed = 0.07 * dt;
        this.bloom += (this.targetBloom - this.bloom) * lerpSpeed;
        this.growth += (this.targetGrowth - this.growth) * 0.05 * dt;
        this.colorPos += (this.targetColorPos - this.colorPos) * 0.14 * dt;

        // ---- Clear ----
        ctx.clearRect(0, 0, cw, ch);

        // ---- Ground grass (behind everything else) ----
        this.drawGrass(cw, ch);

        // ---- Draw hand skeletons ----
        for (let i = 0; i < this.handLandmarks.length; i++) {
            const lm = this.handLandmarks[i];
            const handedness = this.handHandedness[i];
            this.drawHandSkeleton(lm, handedness);
        }

        // ---- Particles ----
        for (const p of this.particles) {
            p.update(dt);
            p.draw(ctx);
        }

        // ---- Fireflies (jugnus) ----
        for (const f of this.fireflies) {
            f.update(dt);
            f.draw(ctx);
        }

        // ---- Floating hearts (romantic touch) ----
        for (const h of this.hearts) {
            h.update(dt);
            h.draw(ctx);
        }

        // ---- Golden sparkle dust (dust motes + flares + diagonal streams) ----
        for (const s of this.sparkles) {
            s.update(dt); // drift + advance its twinkle pulse
            s.draw(ctx);             // render the glowing gold dot for this frame
        }

        // ---- Garden (multiple flower plants) ----
        if (this.growth > 0.005) {
            for (const plant of [...this.gardenPlants, ...this.dynamicPlants]) {
                this.drawPlant(plant, cw, ch);
            }
        }

        this.fallingPetals = this.fallingPetals.filter((petal) => petal.age < petal.life && petal.y < ch + 24);
        for (const petal of this.fallingPetals) {
            petal.update(dt);
            petal.draw(ctx);
        }

        // ---- HUD ----
        this.drawHUD();

        requestAnimationFrame((ts) => this.animate(ts));
    }
}

// =============================================================
// BOOT
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    new FlowerBloomApp();
});
