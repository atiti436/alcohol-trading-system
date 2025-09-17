# 📄 PDF報單辨識與人工調整設計 (PDF Recognition & Manual Adjustment Design)

## 🎯 目標
使用Gemini API進行PDF報單自動辨識（目標準確率85%+），配合人工調整確保100%吻合實際報單內容。

---

## 🤖 AI辨識 + 👤 人工調整流程

### **整體工作流程**
```
PDF上傳 → Gemini API辨識 → 展示辨識結果 → 人工確認/調整 → 儲存最終資料
    ↓           ↓              ↓              ↓              ↓
 檔案檢查    結構化提取      並排顯示       欄位修正        進入系統
```

### **詳細步驟設計**
1. **上傳階段**：PDF檔案上傳與預處理
2. **辨識階段**：Gemini API進行OCR與資料提取
3. **確認階段**：並排顯示原始PDF與辨識結果
4. **調整階段**：人工修正有誤的欄位
5. **儲存階段**：確認後儲存進入採購系統

---

## 📋 需要辨識的報單資料欄位

### **基本資訊 (8個欄位)**
| 欄位名稱 | 資料類型 | 必填 | 說明 |
|----------|----------|------|------|
| `declaration_number` | string | ✅ | 報單號碼 |
| `import_date` | date | ✅ | 進口日期 |
| `origin_country` | string | ✅ | 產地國家 |
| `supplier_name` | string | ✅ | 供應商名稱 |
| `total_quantity` | number | ✅ | 總數量 |
| `total_value_jpy` | number | ✅ | 總價值(日幣) |
| `exchange_rate` | number | ✅ | 申報匯率 |
| `shipping_terms` | string | ❌ | 貿易條件 |

### **商品明細 (每項商品18個欄位)**
| 欄位名稱 | 資料類型 | 必填 | 說明 |
|----------|----------|------|------|
| `product_name_original` | string | ✅ | 原始商品名稱 |
| `product_name_chinese` | string | ❌ | 中文名稱 |
| `product_category` | string | ✅ | 商品分類 |
| `quantity` | number | ✅ | 數量 |
| `unit` | string | ✅ | 單位 |
| `unit_price_jpy` | number | ✅ | 單價(日幣) |
| `total_price_jpy` | number | ✅ | 總價(日幣) |
| `volume_ml` | number | ✅ | 容量(毫升) |
| `alcohol_percentage` | number | ✅ | 酒精度 |
| `weight_kg` | number | ❌ | 重量(公斤) |
| `brand` | string | ❌ | 品牌 |
| `model` | string | ❌ | 型號 |
| `manufacturing_date` | date | ❌ | 製造日期 |
| `expiry_date` | date | ❌ | 到期日 |
| `hs_code` | string | ✅ | 稅則號碼 |
| `duty_rate` | number | ✅ | 關稅稅率 |
| `special_notes` | string | ❌ | 特殊註記 |
| `inspection_result` | string | ❌ | 查驗結果 |

---

## 🔧 技術實作設計

### **前端上傳介面**
```typescript
// components/PDFUploadRecognition.tsx
import { Upload, Button, Card, Row, Col, Form, Input, InputNumber } from 'antd';

interface PDFRecognitionProps {
  onRecognitionComplete: (data: RecognizedData) => void;
}

const PDFUploadRecognition: React.FC<PDFRecognitionProps> = ({ onRecognitionComplete }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognizedData | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const handleUpload = async (file: File) => {
    setPdfFile(file);
    setIsRecognizing(true);

    try {
      // 上傳PDF並進行辨識
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/pdf/recognize', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setRecognitionResult(result.data);
        setShowAdjustment(true);
      }
    } catch (error) {
      message.error('PDF辨識失敗，請重試');
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div className="pdf-recognition-container">
      {/* PDF上傳區域 */}
      {!showAdjustment && (
        <Card title="📄 上傳報單PDF" className="upload-card">
          <Upload.Dragger
            accept=".pdf"
            beforeUpload={handleUpload}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">點擊或拖拽PDF文件到此區域</p>
            <p className="ant-upload-hint">支援單個PDF檔案上傳，建議檔案大小 < 10MB</p>
          </Upload.Dragger>

          {isRecognizing && (
            <div className="recognition-status">
              <Spin size="large" />
              <p>🤖 Gemini AI正在辨識報單內容...</p>
              <Progress percent={recognitionProgress} />
            </div>
          )}
        </Card>
      )}

      {/* 辨識結果確認與調整 */}
      {showAdjustment && recognitionResult && (
        <PDFAdjustmentInterface
          pdfFile={pdfFile}
          recognitionResult={recognitionResult}
          onConfirm={onRecognitionComplete}
          onReupload={() => {
            setShowAdjustment(false);
            setPdfFile(null);
            setRecognitionResult(null);
          }}
        />
      )}
    </div>
  );
};
```

### **PDF與辨識結果並排調整介面**
```typescript
// components/PDFAdjustmentInterface.tsx
const PDFAdjustmentInterface: React.FC<Props> = ({
  pdfFile,
  recognitionResult,
  onConfirm,
  onReupload
}) => {
  const [form] = Form.useForm();
  const [adjustedData, setAdjustedData] = useState(recognitionResult);

  return (
    <div className="pdf-adjustment-layout">
      <Row gutter={16} style={{ height: '100vh' }}>
        {/* 左側：PDF預覽 */}
        <Col span={12}>
          <Card title="📄 原始報單PDF" className="pdf-preview-card">
            <div className="pdf-viewer">
              <PDFViewer file={pdfFile} />
            </div>
          </Card>
        </Col>

        {/* 右側：辨識結果調整 */}
        <Col span={12}>
          <Card
            title={
              <div className="adjustment-header">
                🤖 AI辨識結果
                <Badge
                  count={`準確率: ${recognitionResult.confidence}%`}
                  style={{ backgroundColor: recognitionResult.confidence >= 85 ? '#52c41a' : '#faad14' }}
                />
              </div>
            }
            extra={
              <Space>
                <Button onClick={onReupload}>重新上傳</Button>
                <Button type="primary" onClick={handleConfirm}>
                  確認使用
                </Button>
              </Space>
            }
          >
            <div className="adjustment-form">
              <Form
                form={form}
                layout="vertical"
                initialValues={adjustedData}
                onValuesChange={handleFormChange}
              >
                {/* 基本資訊調整 */}
                <Card size="small" title="基本資訊" className="adjustment-section">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="declaration_number"
                        label="報單號碼"
                        rules={[{ required: true }]}
                      >
                        <Input
                          prefix="📋"
                          className={getConfidenceClass('declaration_number')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="import_date"
                        label="進口日期"
                        rules={[{ required: true }]}
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          className={getConfidenceClass('import_date')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="origin_country"
                        label="產地國家"
                        rules={[{ required: true }]}
                      >
                        <Select
                          showSearch
                          placeholder="選擇或輸入國家"
                          className={getConfidenceClass('origin_country')}
                        >
                          <Option value="日本">日本</Option>
                          <Option value="蘇格蘭">蘇格蘭</Option>
                          <Option value="法國">法國</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="exchange_rate"
                        label="申報匯率"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          step={0.0001}
                          precision={4}
                          style={{ width: '100%' }}
                          className={getConfidenceClass('exchange_rate')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {/* 商品明細調整 */}
                <Card size="small" title="商品明細" className="adjustment-section">
                  <Form.List name="products">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Card
                            key={key}
                            size="small"
                            title={`商品 ${name + 1}`}
                            extra={
                              <Button
                                type="link"
                                danger
                                onClick={() => remove(name)}
                              >
                                刪除
                              </Button>
                            }
                            className="product-adjustment-card"
                          >
                            <Row gutter={16}>
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'product_name_original']}
                                  label="商品名稱"
                                  rules={[{ required: true }]}
                                >
                                  <Input
                                    prefix="🍶"
                                    className={getProductConfidenceClass(name, 'product_name_original')}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'quantity']}
                                  label="數量"
                                  rules={[{ required: true }]}
                                >
                                  <InputNumber
                                    min={1}
                                    style={{ width: '100%' }}
                                    className={getProductConfidenceClass(name, 'quantity')}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'unit_price_jpy']}
                                  label="單價(¥)"
                                  rules={[{ required: true }]}
                                >
                                  <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    className={getProductConfidenceClass(name, 'unit_price_jpy')}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            <Row gutter={16}>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'volume_ml']}
                                  label="容量(ml)"
                                  rules={[{ required: true }]}
                                >
                                  <InputNumber
                                    min={1}
                                    style={{ width: '100%' }}
                                    className={getProductConfidenceClass(name, 'volume_ml')}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'alcohol_percentage']}
                                  label="酒精度(%)"
                                  rules={[{ required: true }]}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    style={{ width: '100%' }}
                                    className={getProductConfidenceClass(name, 'alcohol_percentage')}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'hs_code']}
                                  label="稅則號碼"
                                  rules={[{ required: true }]}
                                >
                                  <Input
                                    placeholder="2208.30.10"
                                    className={getProductConfidenceClass(name, 'hs_code')}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}

                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                          >
                            新增商品
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Card>

                {/* 信心度指示器 */}
                <Card size="small" title="辨識品質指標" className="confidence-indicators">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="整體準確率"
                        value={recognitionResult.confidence}
                        suffix="%"
                        valueStyle={{
                          color: recognitionResult.confidence >= 85 ? '#3f8600' : '#cf1322'
                        }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="需要確認的欄位"
                        value={getLowConfidenceFieldsCount()}
                        suffix="個"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="辨識商品數"
                        value={recognitionResult.products?.length || 0}
                        suffix="項"
                      />
                    </Col>
                  </Row>
                </Card>
              </Form>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

### **後端API設計**
```typescript
// pages/api/pdf/recognize.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 解析上傳的PDF文件
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;

    if (!pdfFile) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded' });
    }

    // 讀取PDF文件
    const pdfBuffer = fs.readFileSync(pdfFile.filepath);

    // 使用Gemini API進行辨識
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      },
      `請分析這份酒類進口報單PDF，提取以下資訊並以JSON格式返回：

{
  "confidence": 0-100的整體信心度,
  "declaration_info": {
    "declaration_number": "報單號碼",
    "import_date": "YYYY-MM-DD",
    "origin_country": "產地國家",
    "supplier_name": "供應商名稱",
    "total_quantity": 總數量,
    "total_value_jpy": 總價值日幣,
    "exchange_rate": 匯率,
    "shipping_terms": "貿易條件"
  },
  "products": [
    {
      "product_name_original": "原始商品名稱",
      "product_name_chinese": "中文名稱",
      "product_category": "商品分類",
      "quantity": 數量,
      "unit": "單位",
      "unit_price_jpy": 單價日幣,
      "total_price_jpy": 總價日幣,
      "volume_ml": 容量毫升,
      "alcohol_percentage": 酒精度,
      "weight_kg": 重量公斤,
      "brand": "品牌",
      "hs_code": "稅則號碼",
      "duty_rate": 關稅稅率,
      "confidence": 該商品辨識信心度0-100
    }
  ],
  "field_confidence": {
    "declaration_number": 0-100,
    "import_date": 0-100,
    "origin_country": 0-100,
    等等各欄位的信心度...
  }
}

請特別注意：
1. 酒精度通常以%表示
2. 容量可能以ml或L表示，請統一轉換為ml
3. 價格通常是日幣
4. 如果某個欄位無法確定，請設信心度較低
5. 商品分類請判斷是beer/spirits/wine中的哪一種`
    ]);

    const response = result.response;
    const text = response.text();

    // 解析JSON回應
    let recognitionData;
    try {
      recognitionData = JSON.parse(text);
    } catch (parseError) {
      // 如果JSON解析失敗，嘗試提取JSON部分
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recognitionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('無法解析AI回應');
      }
    }

    // 資料後處理和驗證
    const processedData = await postProcessRecognitionData(recognitionData);

    // 清理臨時文件
    fs.unlinkSync(pdfFile.filepath);

    res.status(200).json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('PDF recognition error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF辨識失敗，請檢查文件格式或重試'
    });
  }
}

// 後處理辨識資料
async function postProcessRecognitionData(data: any) {
  // 1. 資料格式標準化
  // 2. 信心度計算
  // 3. 欄位完整性檢查
  // 4. 商品分類標準化

  return {
    ...data,
    processing_time: new Date().toISOString(),
    needs_review: data.confidence < 85 || hasLowConfidenceFields(data)
  };
}

function hasLowConfidenceFields(data: any): boolean {
  const lowConfidenceThreshold = 70;

  // 檢查基本資訊欄位信心度
  for (const [field, confidence] of Object.entries(data.field_confidence)) {
    if (confidence < lowConfidenceThreshold) {
      return true;
    }
  }

  // 檢查商品信心度
  for (const product of data.products) {
    if (product.confidence < lowConfidenceThreshold) {
      return true;
    }
  }

  return false;
}
```

---

## 📊 辨識品質控制

### **信心度顏色編碼**
```css
.confidence-high {     /* 90%+ */
  border-left: 4px solid #52c41a;
  background-color: #f6ffed;
}

.confidence-medium {   /* 70-89% */
  border-left: 4px solid #faad14;
  background-color: #fffbe6;
}

.confidence-low {      /* <70% */
  border-left: 4px solid #ff4d4f;
  background-color: #fff2f0;
}
```

### **自動品質檢查規則**
1. **必填欄位檢查**：報單號碼、日期、商品名稱等不能為空
2. **格式驗證**：日期格式、數字範圍、稅則號碼格式
3. **邏輯檢查**：總價 = 單價 × 數量、日期合理性
4. **異常值偵測**：價格過高/過低、酒精度超範圍

---

## 🔧 使用者體驗設計

### **辨識進度指示**
- 文件上傳進度條
- AI辨識狀態提示
- 預估完成時間

### **調整便利功能**
- 一鍵復原AI辨識結果
- 批量修正相似欄位
- 智慧建議相似商品
- 常用值快速選擇

### **錯誤處理**
- 辨識失敗重試機制
- 部分辨識結果保存
- 手動輸入降級方案

---

## 📋 測試驗證方案

### **準確率測試**
- 準備20份標準報單PDF
- 人工標註正確答案
- 測試辨識準確率
- 目標：整體準確率 > 85%

### **邊界測試**
- 模糊PDF文件
- 手寫文字報單
- 不同格式樣式
- 多頁複雜報單

### **效能測試**
- 大檔案處理速度
- 並發辨識能力
- API回應時間
- 記憶體使用量

---

**這個設計完美符合您的需求：Gemini API自動辨識 + 人工調整確保準確性！** 🎯

## 📝 **總結**

現在您有：
1. **完整的PDF辨識+人工調整設計** - 新建立的 `PDF_RECOGNITION_DESIGN.md`
2. **現有的Room-3工作包** - 已包含AI辨識規劃
3. **降級策略** - 如果AI失敗有完整備案

這樣螞蟻就能按照您的期望：**85%+自動辨識 + 人工確保100%準確**！ 🚀