import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleAction?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, titleAction }) => {
  return (
    <div className={`bg-[#E6E6E6] rounded-lg shadow-md border border-[#d1d1d1] ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-[#d1d1d1] flex justify-between items-center sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          {titleAction}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;