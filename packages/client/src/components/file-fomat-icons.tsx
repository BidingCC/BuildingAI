import React from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const fileFormatIconsMap: Record<string, React.ReactNode> = {
  docx: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A90E2"></stop>
          <stop offset="100%" stopColor="#0070C0"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#4A90E2"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#0070C0"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileBlue)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        DOCX
      </text>
    </svg>
  ),
  html: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileHTML" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E44D26"></stop>
          <stop offset="100%" stopColor="#F16529"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#E44D26"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#F16529"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileHTML)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        HTML
      </text>
    </svg>
  ),
  csv: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileLightBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00B0FF"></stop>
          <stop offset="100%" stopColor="#0091EA"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#00B0FF"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#0091EA"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileLightBlue)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        CSV
      </text>
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B6B"></stop>
          <stop offset="100%" stopColor="#E60023"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FF5A5A"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#E60023"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileRed)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        PDF
      </text>
    </svg>
  ),
  txt: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileGray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9E9E9E"></stop>
          <stop offset="100%" stopColor="#616161"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#9E9E9E"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#616161"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileGray)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        TXT
      </text>
    </svg>
  ),
  ppt: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileOrange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9900"></stop>
          <stop offset="100%" stopColor="#FF6600"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FF9900"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#FF6600"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileOrange)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        PPT
      </text>
    </svg>
  ),
  pptx: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileOrange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9900"></stop>
          <stop offset="100%" stopColor="#FF6600"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FF9900"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#FF6600"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileOrange)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        PPTX
      </text>
    </svg>
  ),
  xls: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00C853"></stop>
          <stop offset="100%" stopColor="#009624"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#00C853"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#009624"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileGreen)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        XLS
      </text>
    </svg>
  ),
  xlsx: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00C853"></stop>
          <stop offset="100%" stopColor="#009624"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#00C853"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#009624"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileGreen)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        XLSX
      </text>
    </svg>
  ),
  json: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileYellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFEB3B"></stop>
          <stop offset="100%" stopColor="#FBC02D"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FFEB3B"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#FBC02D"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileYellow)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        JSON
      </text>
    </svg>
  ),
  md: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="filePink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF4081"></stop>
          <stop offset="100%" stopColor="#C51162"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FF4081"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#C51162"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#filePink)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        MD
      </text>
    </svg>
  ),
  rtf: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="fileOrangeDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6D00"></stop>
          <stop offset="100%" stopColor="#E65100"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#FF6D00"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#E65100"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#fileOrangeDark)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        RTF
      </text>
    </svg>
  ),
  xml: (
    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="80"></feGaussianBlur>
        </filter>
        <linearGradient id="filePurple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7B1FA2"></stop>
          <stop offset="100%" stopColor="#4A148C"></stop>
        </linearGradient>
      </defs>
      <rect
        x="80"
        y="80"
        width="864"
        height="864"
        rx="160"
        fill="#7B1FA2"
        opacity="0.12"
        filter="url(#softBlur)"
      ></rect>
      <ellipse
        cx="512"
        cy="900"
        rx="220"
        ry="40"
        fill="#4A148C"
        opacity="0.35"
        filter="url(#softBlur)"
      ></ellipse>
      <path
        d="M300 160h320l200 200v400a64 64 0 0 1-64 64H300a64 64 0 0 1-64-64V224a64 64 0 0 1 64-64z"
        fill="url(#filePurple)"
      ></path>
      <path d="M620 160v136a64 64 0 0 0 64 64h136" fill="#FFFFFF" opacity="0.9"></path>
      <text
        x="530"
        y="680"
        textAnchor="middle"
        fontSize="150"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Arial Black, Helvetica, sans-serif"
      >
        XML
      </text>
    </svg>
  ),
};

export interface FileFormatIconProps {
  format?: string;
  className?: string;
}

export const FileFormatIcon: React.FC<FileFormatIconProps> = ({ format, className, ...props }) => {
  if (!format) {
    return null;
  }

  const icon = fileFormatIconsMap[format.toLowerCase()];

  if (!icon) {
    return null;
  }

  const iconElement = icon as React.ReactElement<
    { className?: string } & React.SVGAttributes<SVGSVGElement>
  >;

  return React.cloneElement(iconElement, {
    className: `${iconElement.props?.className || ""} ${className || ""}`.trim(),
    ...props,
  });
};
