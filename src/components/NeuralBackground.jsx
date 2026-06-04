import { useEffect, useRef } from "react";

export default function NeuralBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let pts = [];
    const mouse = { x: null, y: null };
    let animationFrameId;

    function initNC() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      pts = [];
      const n = Math.min(130, Math.floor(window.innerWidth / 10));
      for (let i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.38,
          vy: (Math.random() - 0.5) * 0.38,
          s: Math.random() * 1.8 + 0.4,
          o: Math.random() * 0.5 + 0.2,
        });
      }
    }

    function drawNC() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.75
      );
      g.addColorStop(0, "#020024");
      g.addColorStop(1, "#010114");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      pts.forEach((p, i) => {
        if (mouse.x) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 180) {
            p.x += dx * 0.007;
            p.y += dy * 0.007;
          }
        }
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.o})`;
        ctx.fill();

        if (p.s > 1.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 212, 255, 0.03)";
          ctx.fill();
        }

        for (let j = i + 1; j < pts.length; j++) {
          const p2 = pts[j];
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 145) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - d / 145) * 0.14})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }

        if (mouse.x) {
          const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (md < 200) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - md / 200) * 0.38})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(drawNC);
    }

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      initNC();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    initNC();
    drawNC();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="nc"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
