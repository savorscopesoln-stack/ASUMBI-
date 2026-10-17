
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api";
import {
  MonitorCheck,
  Clock,
  Loader2,
  Inbox,
  AlertTriangle,
  FileText,
  PlayCircle,
  Timer,
  BookOpen,
  Eye,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  GraduationCap,
  RefreshCw,
  CalendarDays,
  ListChecks,
  PencilLine,
  Star,
  MousePointer2,
  User,
  Building2,
  LogOut,
  ArrowRight,
} from "lucide-react";

const LOGO_URL =
  import.meta.env.VITE_DORAVO_LOGO_URL || "/doravo-core-logo.png";

const injectPickerStyles = () => {
  if (document.getElementById("doravo-assessment-picker-styles")) return;

  const style = document.createElement("style");
  style.id = "doravo-assessment-picker-styles";

  style.textContent = `
    .assessment-picker {
      --ap-bg: var(--bg, #f7f7f8);
      --ap-card: var(--card, #fff);
      --ap-border: var(--border, #e7e3e4);
      --ap-text: var(--text, #202027);
      --ap-secondary: var(--text-secondary, #55515a);
      --ap-muted: var(--text-muted, #79747d);
      --ap-primary: var(--primary, #801b32);
      --ap-primary-dark: var(--primary-dark, #641326);
      --ap-tint: var(--primary-tint, #f8ecef);
      --ap-gold: #d6a83f;
      color: var(--ap-text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system,
        BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .assessment-picker * {
      box-sizing: border-box;
    }

    .ap-shell {
      width: 100%;
      max-width: none;
      margin: 0 auto;
    }

    .ap-brandline {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0 0 24px;
      min-height: 42px;
    }

    .ap-logo {
      display: block;
      width: 178px;
      max-width: 44vw;
      max-height: 52px;
      object-fit: contain;
      object-position: left center;
    }

    .ap-brand-divider {
      height: 30px;
      width: 1px;
      background: var(--ap-border);
    }

    .ap-brand-caption {
      font-size: 14px;
      color: var(--ap-muted);
      letter-spacing: .02em;
    }

    .ap-logo-fallback {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #801b32;
      line-height: 1;
    }

    .ap-logo-symbol {
      display: grid;
      place-items: center;
      width: 37px;
      height: 37px;
      border-radius: 11px 11px 11px 3px;
      background: #801b32;
      color: #fff;
      font-size: 25px;
      font-weight: 900;
      box-shadow: inset -5px -4px 0 #d6a83f;
    }

    .ap-logo-fallback strong {
      display: block;
      font-size: 20px;
      letter-spacing: .02em;
      font-weight: 850;
    }

    .ap-logo-fallback small {
      display: block;
      text-align: center;
      margin-top: 3px;
      font-size: 9px;
      letter-spacing: .28em;
      font-weight: 700;
    }

    .ap-hero {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(210px, .62fr);
      align-items: center;
      gap: 24px;
      padding: clamp(24px, 3.7vw, 42px);
      border: 1px solid #f0dfe2;
      border-radius: 22px;
      background: linear-gradient(
        110deg, #fff9f8 0%, #fff4f1 58%, #fbefed 100%
      );
      color: #34252a;
      box-shadow: 0 10px 28px rgba(67, 27, 37, .055);
      margin-bottom: 30px;
    }

    .ap-hero::before {
      content: "";
      position: absolute;
      z-index: -1;
      width: 290px;
      height: 290px;
      right: 8%;
      top: -190px;
      border: 1px solid rgba(128, 27, 50, .11);
      border-radius: 50%;
    }

    .ap-hero::after {
      content: "";
      position: absolute;
      z-index: -1;
      width: 220px;
      height: 220px;
      right: 2%;
      bottom: -170px;
      border: 1px dashed rgba(214, 168, 63, .45);
      border-radius: 50%;
    }

    .ap-hero-copy-wrap {
      position: relative;
      z-index: 1;
    }

    .ap-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #801b32;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .ap-eyebrow svg {
      color: #b78627;
    }

    .ap-hero h1 {
      max-width: 690px;
      margin: 0;
      color: #74172d;
      font-size: clamp(29px, 3.3vw, 43px);
      line-height: 1.1;
      letter-spacing: -.045em;
      font-weight: 800;
    }

    .ap-hero-copy {
      max-width: 650px;
      margin: 14px 0 0;
      color: #65545a;
      font-size: 17px;
      line-height: 1.8;
    }

    .ap-hero-tip {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 21px;
      color: #4d4146;
      font-size: 14px;
      font-weight: 650;
    }

    .ap-hero-tip svg {
      color: #8a2037;
      flex-shrink: 0;
    }

    .ap-hero-art {
      position: relative;
      min-height: 150px;
      display: grid;
      place-items: center;
      color: #801b32;
    }

    .ap-art-orbit {
      position: absolute;
      width: 155px;
      height: 155px;
      border: 1px solid rgba(128, 27, 50, .13);
      border-radius: 50%;
      animation: ap-orbit 28s linear infinite;
    }

    .ap-art-orbit::before,
    .ap-art-orbit::after {
      content: "";
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d6a83f;
      box-shadow: 0 0 0 5px rgba(214, 168, 63, .12);
    }

    .ap-art-orbit::before {
      top: 16px;
      left: 24px;
    }

    .ap-art-orbit::after {
      right: 4px;
      bottom: 36px;
      width: 7px;
      height: 7px;
      background: #801b32;
    }

    .ap-art-badge {
      width: 106px;
      height: 106px;
      display: grid;
      place-items: center;
      border-radius: 30px;
      color: #801b32;
      background: rgba(255, 255, 255, .76);
      border: 1px solid rgba(128, 27, 50, .12);
      box-shadow: 0 14px 34px rgba(128, 27, 50, .09);
      animation: ap-float 5s ease-in-out infinite;
    }

    .ap-art-badge svg {
      width: 53px;
      height: 53px;
      stroke-width: 1.5;
    }

    .ap-doodle {
      position: absolute;
      color: #c69a3a;
      opacity: .85;
    }

    .ap-doodle-star {
      top: 8px;
      right: 15%;
      animation: ap-drift 6s ease-in-out infinite;
    }

    .ap-doodle-pencil {
      left: 9%;
      bottom: 12px;
      animation: ap-drift 7s ease-in-out infinite reverse;
    }

    .ap-art-note {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 11px;
      color: #8b5360;
      font-style: italic;
      letter-spacing: .03em;
    }

    @keyframes ap-float {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-7px) rotate(2deg); }
    }

    @keyframes ap-orbit {
      to { transform: rotate(360deg); }
    }

    @keyframes ap-drift {
      0%, 100% { transform: translateY(0) rotate(0); }
      50% { transform: translateY(-7px) rotate(8deg); }
    }

    .ap-section {
      margin: 0 0 34px;
    }

    .ap-section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 17px;
    }

    .ap-section-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .ap-section-mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      color: var(--ap-primary);
      background: var(--ap-tint);
      flex-shrink: 0;
    }

    .ap-section-title {
      margin: 0;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: -.025em;
    }

    .ap-section-sub {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--ap-muted);
      line-height: 1.5;
    }

    .ap-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      height: 27px;
      padding: 0 9px;
      border-radius: 8px;
      background: var(--ap-card);
      border: 1px solid var(--ap-border);
      color: var(--ap-secondary);
      font-size: 12px;
      font-weight: 800;
    }

    .ap-live-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 11px;
      border: 1px solid rgba(21, 128, 61, .14);
      border-radius: 999px;
      background: #eef8f1;
      color: #187443;
      font-size: 13px;
      font-weight: 750;
      white-space: nowrap;
    }

    .ap-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      animation: ap-pulse 2.4s ease-in-out infinite;
    }

    @keyframes ap-pulse {
      50% { opacity: .45; transform: scale(.88); }
    }

    .ap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 22px;
      align-items: stretch;
    }

    .ap-card {
      position: relative;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ap-border);
      border-radius: 15px;
      background: var(--ap-card);
      box-shadow: 0 3px 12px rgba(30, 20, 25, .035);
      transition:
        transform .28s cubic-bezier(.2, .75, .25, 1),
        border-color .28s ease,
        box-shadow .28s ease;
      animation: ap-card-enter .55s both;
    }

    .ap-card:nth-child(2) { animation-delay: .06s; }
    .ap-card:nth-child(3) { animation-delay: .12s; }
    .ap-card:nth-child(4) { animation-delay: .18s; }

    @keyframes ap-card-enter {
      from { opacity: 0; transform: translateY(9px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ap-card:hover {
      transform: translateY(-4px);
      border-color: rgba(128, 27, 50, .3);
      box-shadow: 0 13px 28px rgba(54, 25, 34, .075);
    }

    .ap-card.ap-selected {
      border-color: rgba(128, 27, 50, .5);
      box-shadow:
        0 0 0 2px rgba(128, 27, 50, .07),
        0 12px 28px rgba(54, 25, 34, .055);
    }

    .ap-card-stripe {
      height: 3px;
      width: 100%;
      background: linear-gradient(
        90deg, #801b32 0%, #b44b5c 55%, #d6a83f 100%
      );
    }

    .ap-card-content {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 23px;
    }

    .ap-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .ap-open-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 7px;
      padding: 7px 9px;
      color: #187443;
      background: #eef8f1;
      font-size: 10px;
      font-weight: 800;
    }

    .ap-open-chip .ap-live-dot {
      width: 6px;
      height: 6px;
    }

    .ap-duration {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--ap-muted);
      font-size: 13px;
      font-weight: 650;
    }

    .ap-card-title {
      margin: 0;
      color: var(--ap-text);
      font-size: 22px;
      line-height: 1.35;
      font-weight: 800;
      letter-spacing: -.025em;
      overflow-wrap: anywhere;
    }

    .ap-subject {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 0;
      color: var(--ap-secondary);
      font-size: 14px;
      font-weight: 600;
    }

    .ap-subject svg {
      color: var(--ap-primary);
      flex-shrink: 0;
    }

    .ap-divider {
      height: 1px;
      background: var(--ap-border);
      margin: 18px 0 15px;
    }

    .ap-meta-row {
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--ap-muted);
      font-size: 11px;
      margin: 0 0 9px;
    }

    .ap-meta-row svg {
      color: #8b6570;
      flex-shrink: 0;
    }

    .ap-time-panel {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px;
      margin-top: 5px;
      border: 1px solid rgba(21, 128, 61, .12);
      border-radius: 11px;
      background: #f0f8f2;
    }

    .ap-time-panel.ap-urgent {
      background: #fff7e8;
      border-color: rgba(180, 83, 9, .18);
    }

    .ap-time-icon {
      display: grid;
      place-items: center;
      width: 37px;
      height: 37px;
      border-radius: 10px;
      background: #fff;
      color: #187443;
      flex-shrink: 0;
    }

    .ap-time-panel.ap-urgent .ap-time-icon {
      color: #a16207;
    }

    .ap-time-label {
      color: var(--ap-secondary);
      font-size: 12px;
      font-weight: 750;
      margin-bottom: 3px;
    }

    .ap-time-value {
      color: var(--ap-text);
      font-size: 23px;
      line-height: 1.2;
      font-weight: 800;
      letter-spacing: -.025em;
      font-variant-numeric: tabular-nums;
    }

    .ap-time-note {
      margin-top: 4px;
      color: var(--ap-muted);
      font-size: 12px;
    }

    /* Button layout */
    .ap-card-actions {
      position: relative;
      display: flex;
      align-items: stretch;
      gap: 9px;
      margin-top: auto;
      padding-top: 28px;
    }

    .ap-btn {
      min-height: 43px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 9px;
      padding: 10px 13px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      text-decoration: none;
      transition:
        background .2s ease,
        transform .25s ease,
        border-color .2s ease,
        box-shadow .25s ease;
    }

    .ap-btn:active {
      transform: translateY(1px) scale(.99);
    }

    /* BIG, ANIMATED START BUTTON */
    .ap-btn-primary {
      position: relative;
      z-index: 1;
      flex: 1;
      min-width: 0;
      min-height: 62px;
      border: 1px solid #801b32;
      border-radius: 12px;
      background: #801b32;
      color: #fff;
      padding: 16px 18px;
      font-size: 16px;
      font-weight: 850;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(128, 27, 50, .17);
      animation: ap-button-pulse 2s ease-in-out infinite;
    }

    .ap-btn-primary span {
      white-space: nowrap;
    }

    .ap-btn-primary:hover {
      transform: translateY(-3px) scale(1.015);
      background: #641326;
      border-color: #641326;
      box-shadow: 0 9px 24px rgba(128, 27, 50, .3);
    }

    .ap-btn-primary:active {
      transform: translateY(0) scale(.99);
    }

    @keyframes ap-button-pulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(128, 27, 50, .17);
      }
      50% {
        box-shadow:
          0 5px 20px rgba(128, 27, 50, .3),
          0 0 0 5px rgba(128, 27, 50, .07);
      }
    }

    /* Bouncing cursor pointing at the Start button */
    .ap-pointer-cursor {
      position: absolute;
      z-index: 3;
      left: 34%;
      top: 0;
      width: 29px;
      height: 29px;
      color: #d6a83f;
      fill: #fff;
      filter: drop-shadow(1px 3px 2px rgba(0, 0, 0, .28));
      pointer-events: none;
      animation: ap-cursor-point 1.1s ease-in-out infinite;
    }

    @keyframes ap-cursor-point {
      0%, 100% {
        transform: translate(0, -4px) rotate(-15deg);
      }
      50% {
        transform: translate(8px, 5px) rotate(-15deg);
      }
    }

    .ap-btn-secondary {
      flex-shrink: 0;
      border: 1px solid var(--ap-border);
      background: var(--ap-card);
      color: var(--ap-secondary);
    }

    .ap-btn-secondary:hover,
    .ap-btn-secondary.ap-btn-active {
      border-color: rgba(128, 27, 50, .35);
      color: var(--ap-primary);
      background: var(--ap-tint);
    }

    .ap-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 46px 22px;
      border: 1px dashed var(--ap-border);
      border-radius: 15px;
      background: var(--ap-card);
    }

    .ap-empty-icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--ap-tint);
      color: var(--ap-primary);
      margin-bottom: 14px;
    }

    .ap-empty-title {
      margin: 0;
      color: var(--ap-text);
      font-size: 19px;
      font-weight: 800;
    }

    .ap-empty-copy {
      max-width: 390px;
      margin: 7px 0 0;
      color: var(--ap-muted);
      font-size: 14px;
      line-height: 1.7;
    }

    .ap-reassurance {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 17px;
      color: var(--ap-muted);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }

    .ap-reassurance svg {
      color: #218653;
      flex-shrink: 0;
    }

    .ap-motivation {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin: 24px auto 0;
      max-width: 900px;
      padding: 18px 24px;
      border: 1px solid #f0e6d8;
      border-radius: 14px;
      background: linear-gradient(100deg, #fffaf2, #fff8f7);
      color: #6c4b43;
      text-align: center;
    }

    .ap-motivation::before,
    .ap-motivation::after {
      content: "✦";
      color: #d6a83f;
      font-size: 16px;
      opacity: .7;
    }

    .ap-motivation p {
      margin: 0;
      font-size: 14px;
      line-height: 1.7;
      font-style: italic;
    }

    .ap-motivation strong {
      color: #801b32;
      font-style: normal;
    }

    .ap-error {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 13px 15px;
      margin-bottom: 22px;
      border: 1px solid #fecaca;
      border-radius: 11px;
      background: #fff4f4;
      color: var(--ap-text);
      font-size: 12px;
    }

    .ap-error-message {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .ap-retry {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 10px;
      border: 1px solid var(--ap-border);
      border-radius: 8px;
      background: var(--ap-card);
      color: var(--ap-text);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      flex-shrink: 0;
    }

    .ap-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 200px;
      color: var(--ap-secondary);
      font-size: 13px;
      font-weight: 700;
    }

    .ap-spin {
      animation: ap-spin .8s linear infinite;
    }

    @keyframes ap-spin {
      to { transform: rotate(360deg); }
    }

    .ap-cover-wrap {
      overflow: hidden;
      height: min(75vh, 900px);
      min-height: 360px;
      border: 1px solid var(--ap-border);
      border-radius: 14px;
      background: var(--ap-card);
      box-shadow: 0 5px 20px rgba(15, 23, 42, .04);
    }

    .ap-cover-frame {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    .ap-cover-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
    }

    .ap-cover-name {
      color: var(--ap-muted);
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }


    .ap-identify {
      max-width: 520px;
      margin: 0 auto 34px;
      padding: 28px;
      border: 1px solid var(--ap-border);
      border-radius: 18px;
      background: var(--ap-card);
      box-shadow: 0 8px 24px rgba(30, 20, 25, .05);
    }
    .ap-identify h2 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -.025em; }
    .ap-identify p { margin: 0 0 18px; color: var(--ap-muted); font-size: 14px; line-height: 1.6; }
    .ap-field-label { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 750; color: var(--ap-secondary); }
    .ap-input-wrap {
      display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 52px;
      border: 1.5px solid var(--ap-border); border-radius: 12px; background: var(--ap-bg);
    }
    .ap-input-wrap:focus-within { border-color: var(--ap-primary); }
    .ap-input-wrap svg { color: var(--ap-muted); flex-shrink: 0; }
    .ap-input {
      flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
      color: var(--ap-text); font: inherit; font-size: 16px; font-weight: 650;
    }
    .ap-identify .ap-btn-primary { width: 100%; margin-top: 16px; min-height: 54px; animation: none; }
    .ap-identify .ap-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .ap-id-error { margin-top: 12px; color: #b3261e; font-size: 13px; font-weight: 650; }
    .ap-who {
      display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
      padding: clamp(22px, 2.6vw, 34px) clamp(22px, 3vw, 40px); margin-bottom: 32px;
      border: 1px solid var(--ap-border); border-left: 6px solid var(--ap-primary);
      border-radius: 18px; background: var(--ap-card); box-shadow: 0 6px 20px rgba(30, 20, 25, .05);
    }
    .ap-who-main { display: flex; align-items: center; gap: clamp(16px, 2vw, 26px); min-width: 0; }
    .ap-who-avatar {
      width: clamp(64px, 6vw, 88px); height: clamp(64px, 6vw, 88px); border-radius: 22px; display: grid; place-items: center;
      background: var(--ap-tint); color: var(--ap-primary); flex-shrink: 0;
    }
    .ap-who-avatar svg { width: 46%; height: 46%; }
    .ap-who-name { font-size: clamp(26px, 3vw, 42px); line-height: 1.15; font-weight: 850; letter-spacing: -.03em; overflow-wrap: anywhere; }
    .ap-who-meta { display: flex; flex-wrap: wrap; gap: 8px 26px; margin-top: 10px; color: var(--ap-secondary); font-size: clamp(16px, 1.5vw, 21px); font-weight: 650; }
    .ap-who-meta span { display: inline-flex; align-items: center; gap: 9px; }
    .ap-who-meta svg { width: 1.1em; height: 1.1em; color: var(--ap-primary); }
    .ap-inactive {
      display: flex; gap: 11px; align-items: flex-start; padding: 16px 18px; margin-bottom: 26px;
      border: 1px solid #fecaca; border-radius: 12px; background: #fff4f4; color: #7a1f1a; font-size: 14px; line-height: 1.6;
    }
    .ap-seb-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 750; color: var(--ap-secondary); }

    .assessment-picker button:focus-visible {
      outline: 3px solid var(--ap-gold);
      outline-offset: 3px;
    }

    @media (max-width: 760px) {
      .ap-hero {
        grid-template-columns: 1fr;
        padding: 25px 22px;
        border-radius: 17px;
      }

      .ap-hero-art {
        min-height: 110px;
        margin-top: 3px;
      }

      .ap-art-orbit {
        width: 110px;
        height: 110px;
      }

      .ap-art-badge {
        width: 78px;
        height: 78px;
        border-radius: 23px;
      }

      .ap-art-badge svg {
        width: 40px;
        height: 40px;
      }

      .ap-section-heading {
        align-items: flex-start;
      }

      .ap-section-title {
        font-size: 18px;
      }

      .ap-card-content {
        padding: 17px;
      }

      .ap-card-title {
        font-size: 18px;
      }

      .ap-card-actions {
        flex-direction: column;
        gap: 11px;
      }

      .ap-btn {
        width: 100%;
      }

      .ap-btn-primary {
        min-height: 60px;
        font-size: 16px;
      }

      .ap-pointer-cursor {
        left: 42%;
        top: 0;
      }

      .ap-cover-wrap {
        min-height: 320px;
        height: 62vh;
      }

      .ap-brand-caption,
      .ap-brand-divider {
        display: none;
      }

      .ap-motivation {
        padding: 16px;
        gap: 10px;
      }
    }

    @media (max-width: 380px) {
      .ap-btn-primary {
        gap: 6px;
        padding-left: 10px;
        padding-right: 10px;
        font-size: 14px;
      }

      .ap-pointer-cursor {
        left: 38%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .assessment-picker *,
      .assessment-picker *::before,
      .assessment-picker *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;

  document.head.appendChild(style);
};

// The student's identity (assessment number, name, school) is remembered for
// this browser tab only, so the exam sign-in page can pre-fill the username.
// Key is shared with TakeEAssessment.jsx.
const IDENTITY_KEY = "doravo_exam_identity";
const readIdentity = () => {
  try {
    const raw = sessionStorage.getItem(IDENTITY_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && v.username ? v : null;
  } catch { return null; }
};
const saveIdentity = (v) => { try { sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(v)); } catch { /* ignore */ } };
const clearIdentity = () => { try { sessionStorage.removeItem(IDENTITY_KEY); } catch { /* ignore */ } };

const END_KEYS = [
  "end_time",
  "ends_at",
  "scheduled_end",
  "end_at",
  "available_until",
  "closes_at",
];

const pickTime = (row, keys) => {
  for (const key of keys) {
    if (row?.[key]) {
      const timestamp = new Date(row[key]).getTime();
      if (!Number.isNaN(timestamp)) return timestamp;
    }
  }
  return null;
};

const pad2 = (number) => String(number).padStart(2, "0");

const fmtCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "0s";

  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${pad2(hours)}h ${pad2(minutes)}m`;
  }

  if (hours > 0) {
    return `${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  }

  return `${minutes}m ${pad2(seconds)}s`;
};

function DoravoLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="ap-logo-fallback" aria-label="Doravo Core">
        <span className="ap-logo-symbol">D</span>
        <span>
          <strong>DORAVO</strong>
          <small>CORE</small>
        </span>
      </div>
    );
  }

  return (
    <img
      className="ap-logo"
      src={LOGO_URL}
      alt="Doravo Core"
      onError={() => setFailed(true)}
    />
  );
}

export default function TakeAssessmentPicker() {
  injectPickerStyles();

  const navigate = useNavigate();

  const [data, setData] = useState({
    active: [],
    fetchedAt: Date.now(),
  });

  // identity: null until the student has entered their assessment number
  const [identity, setIdentity] = useState(readIdentity);
  const [accountActive, setAccountActive] = useState(true);
  const [inactiveMsg, setInactiveMsg] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Looks the student up and loads the exams they may sit.
  // `initial` = the explicit submit of the form (shows errors on the form);
  // otherwise it's a quiet background refresh.
  const identify = async (username, { initial = false } = {}) => {
    try {
      if (initial) { setIdentifying(true); setIdentifyError(""); } else setLoading(true);
      setError("");

      const response = await API.post("/e-assessments/public/identify", { username });
      const payload = response.data || {};
      const who = payload.student || { username };

      saveIdentity(who);
      setIdentity(who);
      setAccountActive(payload.active !== false);
      setInactiveMsg(payload.message || "");
      setData({
        active: Array.isArray(payload.assessments) ? payload.assessments : [],
        fetchedAt: Date.now(),
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "We couldn't check that right now. Please try again.";
      if (initial) setIdentifyError(msg);
      else if (err?.response?.status === 404) { clearIdentity(); setIdentity(null); setIdentifyError(msg); }
      else setError(msg);
    } finally {
      setIdentifying(false);
      setLoading(false);
    }
  };

  const handleIdentify = (e) => {
    e.preventDefault();
    const v = numberInput.trim();
    if (!v) { setIdentifyError("Enter your assessment number."); return; }
    identify(v, { initial: true });
  };

  const notYou = () => {
    clearIdentity();
    setIdentity(null);
    setNumberInput("");
    setData({ active: [], fetchedAt: Date.now() });
    setIdentifyError("");
  };

  const fetchAssessments = () => identity && identify(identity.username);

  // Remembered identity (same tab): load their exams straight away, then keep fresh.
  useEffect(() => {
    if (!identity?.username) return undefined;
    identify(identity.username);
    // 60s +/- up to 15s of jitter so 400 students don't all refresh on the same second
    const poll = setInterval(() => identify(identity.username), 45000 + Math.floor(Math.random() * 30000));
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.username]);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const active = useMemo(() => {
    const relativeEnd = (seconds) =>
      seconds === null || seconds === undefined
        ? null
        : data.fetchedAt + Number(seconds) * 1000;

    return data.active
      .map((row) => ({
        ...row,
        _end:
          relativeEnd(row.seconds_until_end) ??
          pickTime(row, END_KEYS),
      }))
      .filter(
        (row) => row._end === null || row._end > now
      );
  }, [data, now]);

  const selected =
    active.find(
      (assessment) =>
        String(assessment.id) === String(selectedId)
    ) ||
    active.find((assessment) => assessment.cover_page_url) ||
    active[0] ||
    null;

  return (
    <main
      className="assessment-picker dash-main"
      style={{
        padding:
          "clamp(22px, 3.2vw, 46px) clamp(20px, 3.5vw, 56px) 56px",
        background: "var(--bg, #f7f7f8)",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "none",
        margin: 0,
        flex: "1 1 auto",
      }}
    >
      <div className="ap-shell">
        <div className="ap-brandline">
          <DoravoLogo />
          <span className="ap-brand-divider" />
          <span className="ap-brand-caption">
            Learn <span aria-hidden="true">·</span> Assess{" "}
            <span aria-hidden="true">·</span> Grow
          </span>
        </div>

        <header className="ap-hero">
          <div className="ap-hero-copy-wrap">
            <div className="ap-eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              Your next achievement starts here
            </div>

            <h1>Small steps. Big progress.</h1>

            <p className="ap-hero-copy">
              Every assessment is a chance to show how far
              you've come. Take a steady breath, read each
              question carefully, and trust the preparation
              you have put in.
            </p>

            <div className="ap-hero-tip">
              <ShieldCheck size={17} aria-hidden="true" />
              Be calm, manage your time, and do your best.
            </div>
          </div>

          <div className="ap-hero-art" aria-hidden="true">
            <span className="ap-art-orbit" />

            <Star
              className="ap-doodle ap-doodle-star"
              size={25}
              strokeWidth={1.4}
            />

            <PencilLine
              className="ap-doodle ap-doodle-pencil"
              size={24}
              strokeWidth={1.4}
            />

            <div className="ap-art-badge">
              <GraduationCap />
            </div>

            <span className="ap-art-note">
              You can do this.
            </span>
          </div>
        </header>

        {!identity ? (
          <form className="ap-identify" onSubmit={handleIdentify} aria-labelledby="ap-id-heading">
            <h2 id="ap-id-heading">Enter your assessment number</h2>
            <p>We'll find your school and show the assessments that are open for you.</p>

            <label className="ap-field-label" htmlFor="ap-number">Assessment number</label>
            <div className="ap-input-wrap">
              <User size={18} aria-hidden="true" />
              <input
                id="ap-number"
                className="ap-input"
                value={numberInput}
                onChange={(e) => { setNumberInput(e.target.value); setIdentifyError(""); }}
                placeholder="e.g. 1234"
                autoComplete="username"
                autoCapitalize="off"
                autoFocus
                aria-invalid={!!identifyError}
              />
            </div>

            {identifyError && <div className="ap-id-error" role="alert">{identifyError}</div>}

            <button className="ap-btn ap-btn-primary" type="submit" disabled={identifying || !numberInput.trim()}>
              {identifying ? <Loader2 size={20} className="ap-spin" aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
              <span>{identifying ? "Checking…" : "Continue"}</span>
            </button>
          </form>
        ) : (
        <>
        <div className="ap-who">
          <div className="ap-who-main">
            <div className="ap-who-avatar"><User aria-hidden="true" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="ap-who-name">{identity.name || identity.username}</div>
              <div className="ap-who-meta">
                <span><ListChecks aria-hidden="true" />No. {identity.username}</span>
                {identity.school && <span><Building2 aria-hidden="true" />{identity.school}</span>}
                {identity.class && <span><GraduationCap aria-hidden="true" />{identity.class}</span>}
              </div>
            </div>
          </div>
          <button className="ap-btn ap-btn-secondary" type="button" onClick={notYou}>
            <LogOut size={15} aria-hidden="true" />
            Not you?
          </button>
        </div>

        {!accountActive && (
          <div className="ap-inactive" role="alert">
            <AlertTriangle size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{inactiveMsg || "Your account isn't active, so you can't sit for assessments. Please contact the school office."}</span>
          </div>
        )}

        {error && !loading && (
          <div className="ap-error" role="alert">
            <AlertTriangle size={19} aria-hidden="true" />

            <span className="ap-error-message">
              {error}
            </span>

            <button
              className="ap-retry"
              onClick={fetchAssessments}
              type="button"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {!accountActive ? null : loading && data.active.length === 0 ? (
          <div
            className="ap-loading"
            role="status"
            aria-live="polite"
          >
            <Loader2
              size={21}
              className="ap-spin"
              aria-hidden="true"
            />
            Checking for open assessments…
          </div>
        ) : (
          <>
            <section
              className="ap-section"
              aria-labelledby="ap-open-heading"
            >
              <div className="ap-section-heading">
                <div className="ap-section-title-wrap">
                  <div className="ap-section-mark">
                    <MonitorCheck
                      size={21}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <h2
                      id="ap-open-heading"
                      className="ap-section-title"
                    >
                      Available assessments
                    </h2>

                    <p className="ap-section-sub">
                      Choose a paper below when you're ready
                      to begin.
                    </p>
                  </div>

                  <span
                    className="ap-count"
                    aria-label={`${active.length} open assessments`}
                  >
                    {active.length}
                  </span>
                </div>

                <span className="ap-live-label">
                  <span
                    className="ap-live-dot"
                    aria-hidden="true"
                  />
                  Live updates
                </span>
              </div>

              {active.length === 0 ? (
                <div className="ap-empty">
                  <div className="ap-empty-icon">
                    <Inbox size={26} aria-hidden="true" />
                  </div>

                  <h3 className="ap-empty-title">
                    Your next assessment will appear here
                  </h3>

                  <p className="ap-empty-copy">
                    There are no open assessments for you at
                    the moment. When your teacher opens one, it
                    will appear here automatically.
                  </p>

                  <div className="ap-reassurance">
                    <ShieldCheck
                      size={15}
                      aria-hidden="true"
                    />
                    Keep preparing — every small step counts.
                  </div>
                </div>
              ) : (
                <div className="ap-grid">
                  {active.map((assessment, index) => {
                    const isSelected =
                      selected &&
                      String(selected.id) ===
                        String(assessment.id);

                    const timeLeft = assessment._end
                      ? assessment._end - now
                      : null;

                    const urgent =
                      timeLeft !== null &&
                      timeLeft < 10 * 60 * 1000;

                    return (
                      <article
                        key={assessment.id}
                        className={`ap-card${
                          isSelected ? " ap-selected" : ""
                        }`}
                      >
                        <div
                          className="ap-card-stripe"
                          aria-hidden="true"
                        />

                        <div className="ap-card-content">
                          <div className="ap-card-top">
                            <span className="ap-open-chip">
                              <span
                                className="ap-live-dot"
                                aria-hidden="true"
                              />
                              Open now
                            </span>

                            {assessment.duration_minutes ? (
                              <span className="ap-duration">
                                <Clock
                                  size={14}
                                  aria-hidden="true"
                                />
                                {assessment.duration_minutes}{" "}
                                minutes allowed
                              </span>
                            ) : null}
                          </div>

                          <h3 className="ap-card-title">
                            {assessment.title || "Assessment"}
                          </h3>

                          {assessment.subject && (
                            <p className="ap-subject">
                              <BookOpen
                                size={15}
                                aria-hidden="true"
                              />
                              {assessment.subject}
                            </p>
                          )}

                          <div className="ap-divider" />

                          {assessment.question_count != null && (
                            <p className="ap-meta-row">
                              <ListChecks
                                size={14}
                                aria-hidden="true"
                              />
                              {assessment.question_count} questions
                            </p>
                          )}

                          {assessment.opens_at && (
                            <p className="ap-meta-row">
                              <CalendarDays
                                size={14}
                                aria-hidden="true"
                              />
                              Opens:{" "}
                              {new Date(
                                assessment.opens_at
                              ).toLocaleString()}
                            </p>
                          )}

                          <div
                            className={`ap-time-panel${
                              urgent ? " ap-urgent" : ""
                            }`}
                          >
                            <div className="ap-time-icon">
                              <Timer
                                size={21}
                                aria-hidden="true"
                              />
                            </div>

                            <div>
                              <div className="ap-time-label">
                                {assessment._end
                                  ? "Time remaining to submit"
                                  : "Time allowed"}
                              </div>

                              <div className="ap-time-value">
                                {assessment._end
                                  ? fmtCountdown(timeLeft)
                                  : `${
                                      assessment.duration_minutes ||
                                      "Not set"
                                    }${
                                      assessment.duration_minutes
                                        ? " minutes"
                                        : ""
                                    }`}
                              </div>

                              <div className="ap-time-note">
                                {urgent
                                  ? "Closing time is approaching. Start when you're ready."
                                  : "Work steadily and keep an eye on your time."}
                              </div>
                            </div>
                          </div>

                          <div className="ap-card-actions">
                            {/* Show the animated cursor on the first card only */}
                            {index === 0 && (
                              <MousePointer2
                                className="ap-pointer-cursor"
                                size={29}
                                aria-hidden="true"
                              />
                            )}

                            <button
                              className="ap-btn ap-btn-primary"
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/take-assessment/${assessment.id}`
                                )
                              }
                            >
                              <PlayCircle
                                size={21}
                                aria-hidden="true"
                              />

                              <span>Start assessment</span>

                              <ArrowUpRight
                                size={19}
                                aria-hidden="true"
                              />
                            </button>

                            {assessment.cover_page_url && (
                              <button
                                className={`ap-btn ap-btn-secondary${
                                  isSelected
                                    ? " ap-btn-active"
                                    : ""
                                }`}
                                type="button"
                                aria-pressed={!!isSelected}
                                onClick={() =>
                                  setSelectedId(assessment.id)
                                }
                              >
                                <Eye
                                  size={15}
                                  aria-hidden="true"
                                />
                                View cover
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="ap-reassurance">
                <ShieldCheck
                  size={15}
                  aria-hidden="true"
                />
                Take a moment to read the instructions.
                Progress comes one question at a time.
              </div>

              <div className="ap-motivation">
                <Sparkles size={18} aria-hidden="true" />

                <p>
                  <strong>Keep going.</strong> You don't have
                  to be perfect — just give each question your
                  best effort.
                </p>

                <Star size={17} aria-hidden="true" />
              </div>
            </section>

            {selected?.cover_page_url && (
              <section
                className="ap-section"
                aria-label="Selected assessment cover page"
              >
                <div className="ap-section-heading">
                  <div className="ap-section-title-wrap">
                    <div className="ap-section-mark">
                      <FileText
                        size={20}
                        aria-hidden="true"
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h2 className="ap-cover-title">
                        Assessment cover page
                      </h2>

                      <div className="ap-cover-name">
                        {selected.title}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ap-cover-wrap">
                  <iframe
                    key={selected.id}
                    src={`${resolveFileUrl(
                      selected.cover_page_url
                    )}#toolbar=0&navpanes=0&view=FitH`}
                    title={`${selected.title} cover page`}
                    className="ap-cover-frame"
                  />
                </div>
              </section>
            )}
          </>
        )}
        </>
        )}
      </div>
    </main>
  );
}
