import React from 'react';

export const LOGO_SRC = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDE2MDAgNTAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZXYtZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzE4NzdGMiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjU1JSIgc3RvcC1jb2xvcj0iI0ZGMDA2NiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjk5MDAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8c3R5bGU+CiAgICAgIC5sb2dvIHsgZm9udC1mYW1pbHk6ICJQcm9kdWN0IFNhbnMiLCAiUG9wcGlucyIsICJJbnRlciIsIHN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgIlNlZ29lIFVJIiwgQXJpYWwsIHNhbnMtc2VyaWY7CiAgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7IGxldHRlci1zcGFjaW5nOiAwOyB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJub25lIi8+CiAgPHRleHQgeD0iNTAiIHk9IjM2MCIgY2xhc3M9ImxvZ28iIGZvbnQtc2l6ZT0iMzYwIiBmaWxsPSJ1cmwoI2V2LWdyYWRpZW50KSI+w4l2w6luZW88L3RleHQ+Cjwvc3ZnPgo=";

interface LogoProps {
  className?: string;
  height?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = "", height = 40 }) => {
  return (
    <img 
      src={LOGO_SRC} 
      alt="Événéo Logo" 
      style={{ height: height, width: 'auto' }}
      className={`select-none ${className}`}
    />
  );
};