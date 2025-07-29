"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Flex, Card, Button, Typography, Input, Upload, Form, Space, message, Select, Modal, Checkbox, Progress, Tooltip, Radio, Switch, Spin } from "antd";
import { CopyOutlined, DownloadOutlined, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { splitTextIntoLines, getTextStats, downloadFile, generateSafeFileName, parseSubtitleContent, convertToFormat, getAvailableFormats, isConversionSupported } from "@/app/utils";
import { VTT_SRT_TIME, LRC_TIME_REGEX, detectSubtitleFormat, getOutputFileExtension, filterSubLines, convertTimeToAss, assHeader } from "@/app/utils/subtitleUtils";
import { FormatSelector } from "@/app/components/FormatSelector";
import { categorizedOptions, findMethodLabel } from "@/app/components/translateAPI";
import { useLanguageOptions, filterLanguageOption } from "@/app/components/languages";
import { useCopyToClipboard } from "@/app/hooks/useCopyToClipboard";
import useFileUpload from "@/app/hooks/useFileUpload";
import useTranslateData from "@/app/hooks/useTranslateData";
import { useTranslations } from "next-intl";

const { TextArea } = Input;
const { Dragger } = Upload;
const { Paragraph } = Typography;

const SubtitleTranslator = () => {
  const tSubtitle = useTranslations("subtitle");
  const t = useTranslations("common");

  const { sourceOptions, targetOptions } = useLanguageOptions();
  const { copyToClipboard } = useCopyToClipboard();
  const {
    isFileProcessing,
    fileList,
    multipleFiles,
    readFile,
    sourceText,
    setSourceText,
    uploadMode,
    singleFileMode,
    setSingleFileMode,
    handleFileUpload,
    handleUploadRemove,
    handleUploadChange,
    resetUpload,
  } = useFileUpload();
  const {
    exportSettings,
    importSettings,
    translationMethod,
    setTranslationMethod,
    translateContent,
    handleTranslate,
    getCurrentConfig,
    handleConfigChange,
    sourceLanguage,
    targetLanguage,
    target_langs,
    setTarget_langs,
    useCache,
    setUseCache,
    multiLanguageMode,
    setMultiLanguageMode,
    translatedText,
    setTranslatedText,
    translateInProgress,
    setTranslateInProgress,
    progressPercent,
    setProgressPercent,
    extractedText,
    setExtractedText,
    handleLanguageChange,
    delay,
    validateTranslate,
  } = useTranslateData();
  const [messageApi, contextHolder] = message.useMessage();

  const sourceStats = useMemo(() => getTextStats(sourceText), [sourceText]);
  const resultStats = useMemo(() => getTextStats(translatedText), [translatedText]);

  const [bilingualSubtitle, setBilingualSubtitle] = useState(false);
  const [bilingualPosition, setBilingualPosition] = useState("below"); // 'above' or 'below'
  const [contextAwareTranslation, setContextAwareTranslation] = useState(true); // 上下文感知翻译开关
  const [outputFormat, setOutputFormat] = useState<string>(""); // Output format selection
  const [detectedFormat, setDetectedFormat] = useState<string>(""); // Detected input format

  useEffect(() => {
    setExtractedText("");
    setTranslatedText("");
    
    // Detect format when source text changes
    if (sourceText.trim()) {
      const lines = splitTextIntoLines(sourceText);
      const format = detectSubtitleFormat(lines);
      if (format !== "error") {
        setDetectedFormat(format);
        // Set default output format to detected format if not already set
        if (!outputFormat) {
          setOutputFormat(format);
        }
      }
    }
  }, [sourceText, outputFormat]);

  const performTranslation = async (sourceText: string, fileNameSet?: string, fileIndex?: number, totalFiles?: number, isSubtitleMode: boolean = true) => {
    const lines = splitTextIntoLines(sourceText);
    const fileType = detectSubtitleFormat(lines);
    if (fileType === "error") {
      messageApi.error(tSubtitle("unsupportedSub"));
      return;
    }
    let assContentStartIndex = 9;

    if (fileType === "ass") {
      const eventIndex = lines.findIndex((line) => line.trim() === "[Events]");
      if (eventIndex !== -1) {
        for (let i = eventIndex; i < lines.length; i++) {
          if (lines[i].startsWith("Format:")) {
            const formatLine = lines[i];
            assContentStartIndex = formatLine.split(",").length - 1;
            break;
          }
        }
      }

      if (assContentStartIndex === 9) {
        const dialogueLines = lines.filter((line) => line.startsWith("Dialogue:")).slice(0, 100);
        if (dialogueLines.length > 0) {
          const commaCounts = dialogueLines.map((line) => line.split(",").length - 1);
          assContentStartIndex = Math.min(...commaCounts);
        }
      }
    }

    const { contentLines, contentIndices, styleBlockLines } = filterSubLines(lines, fileType);

    // Determine target languages to translate to
    const targetLanguagesToUse = multiLanguageMode ? target_langs : [targetLanguage];

    // If no target languages selected in multi-language mode, show error
    if (multiLanguageMode && targetLanguagesToUse.length === 0) {
      messageApi.error(t("noTargetLanguage"));
      return;
    }

    // For each target language, perform translation
    for (const currentTargetLang of targetLanguagesToUse) {
      try {
        // Translate content using the specific target language
        const finalTranslatedLines = await translateContent(contentLines, translationMethod, currentTargetLang, fileIndex, totalFiles, isSubtitleMode && contextAwareTranslation);
        // Copy array to avoid modifying the original lines
        const translatedTextArray = [...lines];

        contentIndices.forEach((index, i) => {
          if (fileType === "ass") {
            const originalLine = lines[index];
            const prefix = originalLine.substring(0, originalLine.split(",", assContentStartIndex).join(",").length + 1);
            if (bilingualSubtitle) {
              const translatedLine = finalTranslatedLines[i];
              translatedTextArray[index] =
                bilingualPosition === "below" ? `${originalLine}\\N${translatedLine}` : `${prefix}${translatedLine}\\N${originalLine.split(",").slice(assContentStartIndex).join(",").trim()}`;
            } else {
              translatedTextArray[index] = `${prefix}${finalTranslatedLines[i]}`;
            }
          } else if (fileType === "lrc") {
            const originalLine = lines[index];
            // 提取原始行中的所有时间标记
            const timeMatches = originalLine.match(new RegExp(LRC_TIME_REGEX.source, "g")) || [];
            const timePrefix = timeMatches.join("");

            if (bilingualSubtitle) {
              const translatedLine = finalTranslatedLines[i];
              const originalContent = originalLine.replace(new RegExp(LRC_TIME_REGEX.source, "g"), "").trim();

              if (bilingualPosition === "below") {
                // 原文在上，翻译在下
                translatedTextArray[index] = `${timePrefix} ${originalContent} / ${translatedLine}`;
              } else {
                // 翻译在上，原文在下
                translatedTextArray[index] = `${timePrefix} ${translatedLine} / ${originalContent}`;
              }
            } else {
              // 仅显示翻译
              translatedTextArray[index] = `${timePrefix} ${finalTranslatedLines[i]}`;
            }
          } else {
            // 非 .ass 文件处理
            translatedTextArray[index] = bilingualSubtitle ? `${lines[index]}\n${finalTranslatedLines[i]}` : finalTranslatedLines[i];
          }
        });

        let finalSubtitle = "";

        // 处理双语模式下的 SRT 和 VTT 字幕，则将内容转换为 .ass 格式
        if (bilingualSubtitle && (fileType === "srt" || fileType === "vtt")) {
          let subtitles = {};
          // 处理时间线和双语字幕的对齐
          contentIndices.forEach((index, i) => {
            // 提取 WebVTT/SRT 时间线，向上寻找有效的时间轴
            let timeLine = "";
            let searchIndex = index - 1;

            while (searchIndex >= 0) {
              if (VTT_SRT_TIME.test(lines[searchIndex])) {
                timeLine = lines[searchIndex];
                break;
              }
              searchIndex--;
            }

            if (!timeLine) return;

            const [startTime, endTime] = timeLine.split(" --> ");
            const assStartTime = convertTimeToAss(startTime.trim());
            const assEndTime = convertTimeToAss(endTime.trim());
            const key = `${assStartTime} --> ${assEndTime}`;

            // 根据 bilingualPosition 决定原文和译文的顺序
            const originalText = lines[index];
            const translatedText = finalTranslatedLines[i];

            // 根据位置设置字幕行
            const isOriginalFirst = bilingualPosition === "above";
            const firstText = isOriginalFirst ? originalText : translatedText;
            const secondText = isOriginalFirst ? translatedText : originalText;

            // 构建或更新字幕对象
            if (subtitles[key]) {
              subtitles[key].first += `\\N${firstText}`;
              subtitles[key].second += `\\N${secondText}`;
            } else {
              subtitles[key] = {
                first: `Dialogue: 0,${assStartTime},${assEndTime},Secondary,NTP,0000,0000,0000,,${firstText}`,
                second: `Dialogue: 0,${assStartTime},${assEndTime},Default,NTP,0000,0000,0000,,${secondText}`,
              };
            }
          });

          const assBody = Object.values(subtitles)
            .map(({ first, second }) => `${first}\n${second}`)
            .join("\n");

          finalSubtitle = `${assHeader}\n${assBody}`;
        } else {
          finalSubtitle = [...translatedTextArray.slice(0, contentIndices[0]), ...styleBlockLines, ...translatedTextArray.slice(contentIndices[0])].join("\n");
        }

        // Convert format if needed
        const finalFormat = outputFormat || fileType;
        let finalContent = finalSubtitle;
        
        if (fileType !== finalFormat && isConversionSupported(fileType, finalFormat)) {
          finalContent = convertSubtitleFormat(finalSubtitle, fileType, finalFormat);
        }

        // Create language-specific file name for download with ISO 639-1 compliance
        const fileName = fileNameSet || multipleFiles[0]?.name || "subtitle";
        const downloadFileName = generateSafeFileName(fileName, currentTargetLang, fileType, finalFormat);

        // Always download in multi-language mode
        if (multiLanguageMode || multipleFiles.length > 1) {
          await downloadFile(finalContent, downloadFileName);
        }

        if (!multiLanguageMode || (multiLanguageMode && currentTargetLang === targetLanguagesToUse[0])) {
          setTranslatedText(finalSubtitle);
        }

        if (multiLanguageMode && currentTargetLang !== targetLanguagesToUse[targetLanguagesToUse.length - 1]) {
          await delay(500);
        }
      } catch (error) {
        console.log(error);
        messageApi.open({
          type: "error",
          content: bilingualSubtitle
            ? `${error.message} ${tSubtitle("bilingualError")}`
            : `${error.message} ${sourceOptions.find((option) => option.value === currentTargetLang)?.label || currentTargetLang}  ${t("translationError")}`,
          duration: 5,
        });
      }
    }
  };

  const handleMultipleTranslate = async () => {
    const isValid = await validateTranslate();
    if (!isValid) {
      return;
    }

    if (multipleFiles.length === 0) {
      messageApi.error(tSubtitle("noFileUploaded"));
      return;
    }

    setTranslateInProgress(true);
    setProgressPercent(0);

    for (let i = 0; i < multipleFiles.length; i++) {
      const currentFile = multipleFiles[i];
      await new Promise<void>((resolve) => {
        readFile(currentFile, async (text) => {
          await performTranslation(text, currentFile.name, i, multipleFiles.length);
          await delay(1500);
          resolve();
        });
      });
    }

    //setMultipleFiles([]);
    setTranslateInProgress(false);
    messageApi.success(tSubtitle("translationComplete"), 10);
  };

  const convertSubtitleFormat = (content: string, fromFormat: string, toFormat: string): string => {
    if (fromFormat === toFormat || !isConversionSupported(fromFormat, toFormat)) {
      return content;
    }
    
    try {
      const entries = parseSubtitleContent(content, fromFormat);
      return convertToFormat(entries, toFormat, bilingualSubtitle);
    } catch (error) {
      console.error('Format conversion failed:', error);
      messageApi.error(t('formatConversionError') || 'Format conversion failed');
      return content;
    }
  };

  const handleExportFile = () => {
    const uploadFileName = multipleFiles[0]?.name;
    const lines = splitTextIntoLines(sourceText);
    const fileType = detectSubtitleFormat(lines);

    // Convert format if needed
    const finalFormat = outputFormat || fileType;
    let finalContent = translatedText;
    
    if (fileType !== finalFormat && isConversionSupported(fileType, finalFormat)) {
      finalContent = convertSubtitleFormat(translatedText, fileType, finalFormat);
    }

    // Generate ISO 639-1 compliant filename with output format
    const baseFileName = uploadFileName || "subtitle";
    const fileName = generateSafeFileName(baseFileName, targetLanguage, fileType, finalFormat);
    
    downloadFile(finalContent, fileName);
    return fileName;
  };

  const handleExtractText = () => {
    if (!sourceText.trim()) {
      messageApi.error(tSubtitle("noSourceText"));
      return;
    }
    const lines = splitTextIntoLines(sourceText);
    const fileType = detectSubtitleFormat(lines);
    if (fileType === "error") {
      messageApi.error(tSubtitle("unsupportedSub"));
    }
    const { contentLines } = filterSubLines(lines, fileType);
    const extractedText = contentLines.join("\n").trim();

    if (!extractedText) {
      messageApi.error(tSubtitle("noExtractedText"));
      return;
    }

    setExtractedText(extractedText);
    copyToClipboard(extractedText, messageApi, tSubtitle("textExtracted"));
  };

  const config = getCurrentConfig();

  return (
    <Spin spinning={isFileProcessing} size="large">
      {contextHolder}
      <Dragger
        customRequest={({ file }) => handleFileUpload(file as File)}
        accept=".srt,.ass,.vtt,.lrc"
        multiple={!singleFileMode}
        showUploadList
        beforeUpload={singleFileMode ? resetUpload : undefined}
        onRemove={handleUploadRemove}
        onChange={handleUploadChange}
        fileList={fileList}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{tSubtitle("dragAndDropText")}</p>
      </Dragger>
      {uploadMode === "single" && (
        <TextArea
          placeholder={tSubtitle("pasteUploadContent")}
          value={sourceStats.displayText}
          onChange={!sourceStats.isTooLong ? (e) => setSourceText(e.target.value) : undefined}
          rows={8}
          className="mt-1 mb-2"
          allowClear
          readOnly={sourceStats.isTooLong}
        />
      )}
      {sourceText && (
        <Paragraph type="secondary" className="-mt-1 mb-2">
          {t("inputStatsTitle")}: {sourceStats.charCount} {t("charLabel")}, {sourceStats.lineCount} {t("lineLabel")}
        </Paragraph>
      )}
      <Form layout="inline" labelWrap className="gap-1 mb-2">
        <Form.Item label={t("translationAPI")}>
          <Space.Compact>
            <Select showSearch value={translationMethod} onChange={(e) => setTranslationMethod(e)} options={categorizedOptions} style={{ minWidth: 150 }} />
            {config?.apiKey !== undefined && translationMethod !== "llm" && (
              <Tooltip title={`${t("enter")} ${findMethodLabel(translationMethod)} API Key`}>
                <Input.Password
                  autoComplete="off"
                  placeholder={`API Key ${findMethodLabel(translationMethod)} `}
                  value={config.apiKey}
                  onChange={(e) => handleConfigChange(translationMethod, "apiKey", e.target.value)}
                />
              </Tooltip>
            )}
          </Space.Compact>
        </Form.Item>
        <Form.Item label={t("sourceLanguage")}>
          <Select
            value={sourceLanguage}
            onChange={(e) => handleLanguageChange("source", e)}
            options={sourceOptions}
            showSearch
            placeholder={t("selectSourceLanguage")}
            optionFilterProp="children"
            filterOption={(input, option) => filterLanguageOption({ input, option })}
            style={{ minWidth: 120 }}
          />
        </Form.Item>
        <Space wrap>
          <Form.Item label={t("targetLanguage")}>
            {!multiLanguageMode ? (
              <Select
                value={targetLanguage}
                onChange={(e) => handleLanguageChange("target", e)}
                options={targetOptions}
                showSearch
                placeholder={t("selectTargetLanguage")}
                optionFilterProp="children"
                filterOption={(input, option) => filterLanguageOption({ input, option })}
                style={{ minWidth: 120 }}
              />
            ) : (
              <Select
                mode="multiple"
                allowClear
                value={target_langs}
                onChange={(e) => setTarget_langs(e)}
                options={targetOptions}
                placeholder={t("selectMultiTargetLanguages")}
                optionFilterProp="children"
                filterOption={(input, option) => filterLanguageOption({ input, option })}
                style={{ minWidth: 300 }}
              />
            )}
          </Form.Item>
        </Space>
        <Form.Item label={tSubtitle("subtitleFormat")}>
          <Space wrap>
            <Tooltip title={tSubtitle("bilingualTooltip")}>
              <Checkbox checked={bilingualSubtitle} onChange={(e) => setBilingualSubtitle(e.target.checked)}>
                {tSubtitle("bilingual")}
              </Checkbox>
            </Tooltip>
            {bilingualSubtitle && (
              <Radio.Group value={bilingualPosition} onChange={(e) => setBilingualPosition(e.target.value)} optionType="button" buttonStyle="solid" size="small">
                <Radio.Button value="above">{tSubtitle("translationAbove")}</Radio.Button>
                <Radio.Button value="below">{tSubtitle("translationBelow")}</Radio.Button>
              </Radio.Group>
            )}
          </Space>
        </Form.Item>
        {detectedFormat && (
          <Form.Item label={t("outputFormat") || "Output Format"}>
            <FormatSelector
              currentFormat={detectedFormat}
              selectedFormat={outputFormat || detectedFormat}
              onFormatChange={setOutputFormat}
              disabled={translateInProgress}
            />
          </Form.Item>
        )}
        <Form.Item label={t("advancedSettings")}>
          <Space wrap>
            <Tooltip title={t("singleFileModeTooltip")}>
              <Checkbox checked={singleFileMode} onChange={(e) => setSingleFileMode(e.target.checked)}>
                {t("singleFileMode")}
              </Checkbox>
            </Tooltip>
            <Tooltip title={t("useCacheTooltip")}>
              <Checkbox checked={useCache} onChange={(e) => setUseCache(e.target.checked)}>
                {t("useCache")}
              </Checkbox>
            </Tooltip>
            <Tooltip title={t("contextAwareTranslationTooltip")}>
              <Checkbox checked={contextAwareTranslation} onChange={(e) => setContextAwareTranslation(e.target.checked)}>
                {t("contextAwareTranslation")}
              </Checkbox>
            </Tooltip>
            <Tooltip title={t("multiLanguageModeTooltip")}>
              <Switch checked={multiLanguageMode} onChange={(checked) => setMultiLanguageMode(checked)} checkedChildren={t("multiLanguageMode")} unCheckedChildren={t("singleLanguageMode")} />
            </Tooltip>
          </Space>
        </Form.Item>
      </Form>
      <Flex gap="small">
        <Button
          type="primary"
          block
          onClick={() => (uploadMode === "single" ? handleTranslate(performTranslation, sourceText, contextAwareTranslation) : handleMultipleTranslate())}
          disabled={translateInProgress}>
          {multiLanguageMode ? `${t("translate")} | ${t("totalLanguages")}${target_langs.length || 0}` : t("translate")}
        </Button>
        <Tooltip title={t("exportSettingTooltip")}>
          <Button
            icon={<DownloadOutlined />}
            onClick={async () => {
              await exportSettings();
            }}>
            {t("exportSetting")}
          </Button>
        </Tooltip>
        <Tooltip title={t("importSettingTooltip")}>
          <Button
            icon={<UploadOutlined />}
            onClick={async () => {
              await importSettings();
            }}>
            {t("importSetting")}
          </Button>
        </Tooltip>
        <Tooltip title={t("resetUploadTooltip")}>
          <Button
            onClick={() => {
              resetUpload();
              setTranslatedText("");
              messageApi.success(t("resetUploadSuccess"));
            }}>
            {t("resetUpload")}
          </Button>
        </Tooltip>
        {uploadMode === "single" && sourceText && <Button onClick={handleExtractText}>{t("extractText")}</Button>}
      </Flex>
      {uploadMode === "single" && (
        <>
          {translatedText && !(multiLanguageMode && target_langs.length > 1) && (
            <Card
              title={t("translationResult")}
              className="mt-3"
              extra={
                <Space wrap>
                  <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(translatedText, messageApi)}>
                    {t("copy")}
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const fileName = handleExportFile();
                      messageApi.success(`${t("exportedFile")}: ${fileName}`);
                    }}>
                    {t("exportFile")}
                  </Button>
                </Space>
              }>
              <TextArea value={resultStats.displayText} rows={10} readOnly />
              <Paragraph type="secondary" className="-mb-2">
                {t("outputStatsTitle")}: {resultStats.charCount} {t("charLabel")}, {resultStats.lineCount} {t("lineLabel")}
              </Paragraph>
            </Card>
          )}
          {extractedText && (
            <Card
              title={t("extractedText")}
              className="mt-3"
              extra={
                <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(extractedText, messageApi)}>
                  {t("copy")}
                </Button>
              }>
              <TextArea value={extractedText} rows={10} readOnly />
            </Card>
          )}
        </>
      )}
      {translateInProgress && (
        <Modal title={t("translating")} open={translateInProgress} footer={null} closable={false}>
          <div className="text-center">
            <Progress type="circle" percent={Math.round(progressPercent * 100) / 100} />
            {multiLanguageMode && target_langs.length > 0 && <p className="mt-4">{`${t("multiTranslating")} ${target_langs.length}`}</p>}
          </div>
        </Modal>
      )}
    </Spin>
  );
};

export default SubtitleTranslator;
