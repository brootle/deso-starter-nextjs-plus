import PropTypes from "prop-types";
import React from "react";

export const Images = ({ className, color, label }) => {

  // Apply inline style only if color prop is not currentColor
  const style = color !== "currentColor" ? { color } : undefined;

  return (
    <svg 
      className={className} 
      role="img"
      aria-label={label}
      style={style}   
      xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="currentColor"
    >
      <g>
        <path d="M24 27H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h22a1 1 0 0 1 1 1v24a1 1 0 0 1-1 1ZM3 25h20V3H3Z"></path>
        <path d="M30 31H8a1 1 0 0 1 0-2h21V7h-1a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v24a1 1 0 0 1-1 1Z"></path>
        <path d="M2 21.86a1 1 0 0 1-.7-.29 1 1 0 0 1 0-1.41L5.35 16a2.67 2.67 0 0 1 3.48-.29l3.59 2.6a.68.68 0 0 0 .88-.08l3.7-3.72a2.75 2.75 0 0 1 3.82 0l3.88 3.93a1 1 0 0 1-1.42 1.4l-3.88-3.93a.69.69 0 0 0-1 0l-3.71 3.75a2.68 2.68 0 0 1-3.48.3l-3.59-2.6a.67.67 0 0 0-.88.07l-4.03 4.13a1 1 0 0 1-.71.3ZM13.85 12.86a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2Z"></path>
      </g>
    </svg>    
  );
};

Images.propTypes = {
  color: PropTypes.string,
  label: PropTypes.string,
};

Images.defaultProps = {
  color: 'currentColor'
};