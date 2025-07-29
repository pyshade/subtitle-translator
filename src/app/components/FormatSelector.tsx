"use client";

import React from 'react';
import { Select, Tooltip, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { getAvailableFormats, isConversionSupported } from '@/app/utils/formatConverter';
import { useTranslations } from 'next-intl';

const { Text } = Typography;

interface FormatSelectorProps {
  currentFormat: string;
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  disabled?: boolean;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  currentFormat,
  selectedFormat,
  onFormatChange,
  disabled = false
}) => {
  const t = useTranslations();
  const availableFormats = getAvailableFormats();

  const formatOptions = availableFormats.map(format => ({
    ...format,
    disabled: !isConversionSupported(currentFormat, format.value)
  }));

  return (
    <div className="format-selector">
      <div className="flex items-center gap-2 mb-2">
        <FileTextOutlined />
        <Text strong>{t('common.outputFormat') || 'Output Format'}</Text>
      </div>
      
      <Select
        value={selectedFormat}
        onChange={onFormatChange}
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder={t('common.selectFormat') || 'Select format'}
      >
        {formatOptions.map(format => (
          <Select.Option 
            key={format.value} 
            value={format.value}
            disabled={format.disabled}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{format.label}</span>
              <Text type="secondary" className="text-xs">
                {format.description}
              </Text>
            </div>
          </Select.Option>
        ))}
      </Select>
      
      {currentFormat !== selectedFormat && (
        <div className="mt-2">
          <Text type="secondary" className="text-xs">
            {t('common.convertingFrom', { from: currentFormat.toUpperCase(), to: selectedFormat.toUpperCase() }) || 
             `Converting from ${currentFormat.toUpperCase()} to ${selectedFormat.toUpperCase()}`}
          </Text>
        </div>
      )}
    </div>
  );
};