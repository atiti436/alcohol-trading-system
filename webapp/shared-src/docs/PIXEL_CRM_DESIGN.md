# 🎮 像素風格CRM管理模組設計

## 🎯 設計理念

將傳統冰冷的CRM系統轉化為有趣的「像素風格遊戲化」體驗，讓使用者在管理客戶關係時彷彿在玩復古電玩遊戲。

---

## 🕹️ **核心概念設計**

### **遊戲化元素對應**
```
傳統CRM概念          →    遊戲化概念
=====================================
使用者              →    玩家一號 (Player One)
客戶/聯絡人          →    角色 (Character)
客戶等級            →    角色等級 (Level)
最後聯絡時間         →    生命值/友好度
客戶狀態            →    角色狀態 (Status Effect)
新增客戶            →    召喚新角色 (SPAWN!)
聯絡客戶            →    互動 (INTERACT!)
客戶升級            →    等級提升 (LEVEL UP!)
```

### **視覺風格規範**
```css
/* 像素風格CSS變數 */
:root {
  /* 像素字體 */
  --pixel-font: 'VT323', 'Courier New', monospace;

  /* 遊戲色彩 */
  --pixel-yellow: #FFD700;
  --pixel-red: #FF4444;
  --pixel-green: #44FF44;
  --pixel-blue: #4444FF;
  --pixel-purple: #FF44FF;
  --pixel-black: #000000;
  --pixel-white: #FFFFFF;

  /* 像素陰影效果 */
  --pixel-shadow: 8px 8px 0px black;
  --pixel-border: 4px solid black;
}

.pixel-container {
  font-family: var(--pixel-font);
  border: var(--pixel-border);
  box-shadow: var(--pixel-shadow);
  background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
}

.pixel-button {
  font-family: var(--pixel-font);
  border: 3px solid black;
  box-shadow: 4px 4px 0px black;
  background: var(--pixel-yellow);
  transition: all 0.1s;
}

.pixel-button:active {
  transform: translateY(2px);
  box-shadow: 2px 2px 0px black;
}
```

---

## 🏠 **主界面設計 - 像素儀表板**

### **遊戲主屏幕**
```tsx
<div className="pixel-dashboard">
  {/* 遊戲標題區 */}
  <div className="game-header">
    <h1 className="pixel-title">
      🎮 CUSTOMER QUEST DASHBOARD 🎮
    </h1>
    <div className="player-info">
      <span className="player-tag">PLAYER ONE:</span>
      <span className="player-name">{userName}</span>
      <div className="player-stats">
        <span>👑 LV.{userLevel}</span>
        <span>⭐ EXP: {userExp}</span>
      </div>
    </div>
  </div>

  {/* 遊戲KPI面板 */}
  <div className="game-kpi-panel">
    <Row gutter={16}>
      <Col span={8}>
        <div className="pixel-kpi-card total-characters">
          <div className="kpi-icon">👥</div>
          <div className="kpi-title">TOTAL CHARACTERS</div>
          <div className="kpi-value">{totalCustomers}</div>
          <div className="kpi-subtitle">客戶總數</div>
        </div>
      </Col>
      <Col span={8}>
        <div className="pixel-kpi-card high-priority">
          <div className="kpi-icon">🔥</div>
          <div className="kpi-title">HIGH PRIORITY</div>
          <div className="kpi-value pulse">{urgentCustomers}</div>
          <div className="kpi-subtitle">緊急聯絡</div>
        </div>
      </Col>
      <Col span={8}>
        <div className="pixel-kpi-card active-quests">
          <div className="kpi-icon">⚡</div>
          <div className="kpi-title">ACTIVE QUESTS</div>
          <div className="kpi-value">{activeDeals}</div>
          <div className="kpi-subtitle">進行中交易</div>
        </div>
      </Col>
    </Row>
  </div>

  {/* 主要遊戲區域 */}
  <div className="game-main-area">
    <div className="game-controls">
      <Space size="large">
        <button className="pixel-button spawn-button" onClick={showAddCustomer}>
          ✨ SPAWN NEW CHARACTER ✨
        </button>
        <button className="pixel-button view-toggle" onClick={toggleView}>
          🔄 SWITCH VIEW: {viewMode === 'card' ? 'TABLE' : 'CARDS'}
        </button>
        <button className="pixel-button quest-log" onClick={showQuestLog}>
          📜 QUEST LOG
        </button>
      </Space>
    </div>

    {/* 角色展示區域 */}
    {viewMode === 'card' ? <PixelCardView /> : <PixelTableView />}
  </div>

  {/* 遊戲底部 */}
  <div className="game-footer">
    <div className="press-start">PRESS START TO CONTINUE...</div>
    <div className="game-version">CUSTOMER QUEST v1.0</div>
  </div>
</div>
```

---

## 🃏 **客戶卡片設計 - 角色卡**

### **像素風格客戶卡片**
```tsx
<div className="character-card-container">
  {customers.map(customer => (
    <div
      key={customer.id}
      className={`character-card ${getUrgencyClass(customer)}`}
      onClick={() => openCharacterDetail(customer)}
    >
      {/* 角色頭像 */}
      <div className="character-avatar">
        <img
          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${customer.id}`}
          alt={customer.name}
          className="pixel-avatar"
        />
        {getUrgency(customer) === 'overdue' && (
          <div className="status-effect danger pulse">⚠️</div>
        )}
        {customer.isVIP && (
          <div className="status-effect vip">👑</div>
        )}
      </div>

      {/* 角色資訊 */}
      <div className="character-info">
        <div className="character-name">{customer.name}</div>
        <div className="character-level">
          LV.{calculateCustomerLevel(customer)}
        </div>
        <div className="character-class">
          {getCustomerClass(customer.type)}
        </div>
      </div>

      {/* 角色狀態 */}
      <div className="character-status">
        <div className="hp-bar">
          <div className="hp-label">FRIENDSHIP</div>
          <div className="hp-bar-container">
            <div
              className="hp-fill"
              style={{ width: `${calculateFriendship(customer)}%` }}
            />
          </div>
        </div>

        <div className="last-contact">
          <span className="contact-label">LAST SEEN:</span>
          <span className="contact-time">
            {formatGameTime(customer.lastContact)}
          </span>
        </div>
      </div>

      {/* 快速操作按鈕 */}
      <div className="character-actions">
        <button
          className="pixel-mini-button interact"
          onClick={(e) => {
            e.stopPropagation();
            logContact(customer.id);
          }}
        >
          💬 TALK
        </button>
        <button
          className="pixel-mini-button quest"
          onClick={(e) => {
            e.stopPropagation();
            createQuest(customer.id);
          }}
        >
          ⚔️ QUEST
        </button>
      </div>
    </div>
  ))}
</div>
```

### **客戶等級計算邏輯**
```typescript
// 遊戲化的客戶等級計算
function calculateCustomerLevel(customer: Customer): number {
  const factors = {
    totalPurchases: customer.totalPurchases || 0,
    totalAmount: customer.totalAmount || 0,
    loyaltyYears: customer.loyaltyYears || 0,
    referralCount: customer.referralCount || 0
  };

  // 基礎等級計算
  let level = 1;
  level += Math.floor(factors.totalPurchases / 5); // 每5次交易升1級
  level += Math.floor(factors.totalAmount / 100000); // 每10萬升1級
  level += factors.loyaltyYears; // 每年升1級
  level += Math.floor(factors.referralCount / 2); // 每推薦2人升1級

  return Math.min(level, 99); // 最高99級
}

// 客戶職業分類
function getCustomerClass(customerType: string): string {
  const classMap = {
    'retail': '🏪 MERCHANT',
    'wholesale': '🏭 GUILD MASTER',
    'restaurant': '🍴 CHEF',
    'bar': '🍺 BARTENDER',
    'hotel': '🏨 INNKEEPER',
    'individual': '👤 ADVENTURER'
  };
  return classMap[customerType] || '❓ UNKNOWN';
}

// 友好度計算（基於最後聯絡時間）
function calculateFriendship(customer: Customer): number {
  const lastContact = new Date(customer.lastContact);
  const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince <= 7) return 100;      // 一周內 100%
  if (daysSince <= 30) return 80;      // 一月內 80%
  if (daysSince <= 90) return 60;      // 三月內 60%
  if (daysSince <= 180) return 40;     // 半年內 40%
  return 20; // 超過半年 20%
}
```

---

## 🎲 **客戶詳細頁面 - 角色面板**

### **角色詳細資訊Modal**
```tsx
<Modal
  title={
    <div className="character-modal-title">
      <span className="modal-icon">🎮</span>
      <span className="modal-text">CHARACTER PROFILE</span>
    </div>
  }
  open={showCharacterDetail}
  width={900}
  className="pixel-modal"
  footer={[
    <button key="close" className="pixel-button" onClick={closeModal}>
      ❌ EXIT
    </button>,
    <button key="quest" className="pixel-button" onClick={createNewQuest}>
      ⚔️ NEW QUEST
    </button>,
    <button key="interact" className="pixel-button primary" onClick={logInteraction}>
      💬 LOG CONTACT
    </button>
  ]}
>
  <div className="character-profile">
    <Row gutter={24}>
      {/* 左側角色卡 */}
      <Col span={8}>
        <div className="character-card-large">
          <div className="character-avatar-large">
            <img
              src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${customer.id}`}
              alt={customer.name}
              className="pixel-avatar-large"
            />
            <div className="character-badges">
              {customer.isVIP && <span className="badge vip">👑 VIP</span>}
              {customer.tags.map(tag => (
                <span key={tag} className="badge tag">{tag}</span>
              ))}
            </div>
          </div>

          <div className="character-stats">
            <h3 className="character-name-large">{customer.name}</h3>
            <div className="stat-line">
              <span className="stat-label">LEVEL:</span>
              <span className="stat-value">{calculateCustomerLevel(customer)}</span>
            </div>
            <div className="stat-line">
              <span className="stat-label">CLASS:</span>
              <span className="stat-value">{getCustomerClass(customer.type)}</span>
            </div>
            <div className="stat-line">
              <span className="stat-label">EXP POINTS:</span>
              <span className="stat-value">{customer.totalPurchases * 100}</span>
            </div>
          </div>

          <div className="friendship-meter">
            <div className="meter-label">FRIENDSHIP LEVEL</div>
            <div className="meter-bar">
              <div
                className="meter-fill"
                style={{
                  width: `${calculateFriendship(customer)}%`,
                  background: getFriendshipColor(customer)
                }}
              />
            </div>
            <div className="meter-text">
              {getFriendshipStatus(customer)}
            </div>
          </div>
        </div>
      </Col>

      {/* 右側詳細資訊 */}
      <Col span={16}>
        <Tabs
          type="card"
          className="pixel-tabs"
          items={[
            {
              key: 'profile',
              label: '📋 PROFILE',
              children: <CharacterProfileTab customer={customer} />
            },
            {
              key: 'quests',
              label: '⚔️ QUESTS',
              children: <QuestHistoryTab customer={customer} />
            },
            {
              key: 'inventory',
              label: '🎒 INVENTORY',
              children: <CustomerOrdersTab customer={customer} />
            },
            {
              key: 'achievements',
              label: '🏆 ACHIEVEMENTS',
              children: <CustomerAchievementsTab customer={customer} />
            }
          ]}
        />
      </Col>
    </Row>
  </div>
</Modal>
```

### **角色資訊編輯 - 可編輯欄位**
```tsx
function EditablePixelField({ label, value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="pixel-edit-field active">
        <span className="field-label">{label}:</span>
        <div className="edit-controls">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="pixel-input"
            onPressEnter={handleSave}
            autoFocus
          />
          <button className="pixel-mini-button save" onClick={handleSave}>
            ✅
          </button>
          <button
            className="pixel-mini-button cancel"
            onClick={() => setEditing(false)}
          >
            ❌
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pixel-edit-field" onClick={() => setEditing(true)}>
      <span className="field-label">{label}:</span>
      <span className="field-value">{value || '---'}</span>
      <span className="edit-hint">✏️ CLICK TO EDIT</span>
    </div>
  );
}
```

---

## 🏆 **成就系統設計**

### **客戶成就定義**
```typescript
interface CustomerAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (customer: Customer) => boolean;
  points: number;
}

const achievements: CustomerAchievement[] = [
  {
    id: 'first_purchase',
    name: '初次冒險',
    description: '完成第一次購買',
    icon: '🎯',
    condition: (c) => c.totalPurchases >= 1,
    points: 100
  },
  {
    id: 'loyal_customer',
    name: '忠誠勇士',
    description: '成為客戶滿一年',
    icon: '🛡️',
    condition: (c) => c.loyaltyYears >= 1,
    points: 500
  },
  {
    id: 'big_spender',
    name: '財富獵人',
    description: '累積消費超過50萬',
    icon: '💰',
    condition: (c) => c.totalAmount >= 500000,
    points: 1000
  },
  {
    id: 'referral_master',
    name: '招募大師',
    description: '推薦5位新客戶',
    icon: '👥',
    condition: (c) => c.referralCount >= 5,
    points: 750
  },
  {
    id: 'frequent_buyer',
    name: '連續購買王',
    description: '連續6個月都有購買',
    icon: '🔥',
    condition: (c) => c.consecutiveMonths >= 6,
    points: 800
  }
];

// 成就檢查和顯示
function CustomerAchievementsTab({ customer }: { customer: Customer }) {
  const earnedAchievements = achievements.filter(ach => ach.condition(customer));
  const totalPoints = earnedAchievements.reduce((sum, ach) => sum + ach.points, 0);

  return (
    <div className="achievements-panel">
      <div className="achievements-summary">
        <div className="total-points">
          <span className="points-label">TOTAL ACHIEVEMENT POINTS:</span>
          <span className="points-value">{totalPoints}</span>
        </div>
        <div className="completion-rate">
          <span className="rate-label">COMPLETION:</span>
          <span className="rate-value">
            {Math.round((earnedAchievements.length / achievements.length) * 100)}%
          </span>
        </div>
      </div>

      <div className="achievements-grid">
        {achievements.map(achievement => {
          const earned = achievement.condition(customer);
          return (
            <div
              key={achievement.id}
              className={`achievement-card ${earned ? 'earned' : 'locked'}`}
            >
              <div className="achievement-icon">
                {earned ? achievement.icon : '🔒'}
              </div>
              <div className="achievement-name">
                {achievement.name}
              </div>
              <div className="achievement-description">
                {achievement.description}
              </div>
              <div className="achievement-points">
                +{achievement.points} EXP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 📊 **任務系統 - Quest Log**

### **客戶任務追蹤**
```typescript
interface CustomerQuest {
  id: string;
  customerId: string;
  questType: 'follow_up' | 'upsell' | 'retention' | 'feedback';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  dueDate: Date;
  reward: number; // EXP獎勵
  createdAt: Date;
  completedAt?: Date;
}

// 任務建立介面
function CreateQuestModal({ customer, onClose }: CreateQuestModalProps) {
  return (
    <Modal
      title="⚔️ CREATE NEW QUEST"
      open={true}
      onCancel={onClose}
      className="pixel-modal"
      footer={[
        <button key="cancel" className="pixel-button" onClick={onClose}>
          ❌ CANCEL
        </button>,
        <button key="create" className="pixel-button primary" onClick={createQuest}>
          ✨ CREATE QUEST
        </button>
      ]}
    >
      <Form layout="vertical">
        <Form.Item label="🎯 QUEST TYPE">
          <Select className="pixel-select">
            <Option value="follow_up">📞 Follow Up Quest</Option>
            <Option value="upsell">📈 Upsell Quest</Option>
            <Option value="retention">🛡️ Retention Quest</Option>
            <Option value="feedback">💬 Feedback Quest</Option>
          </Select>
        </Form.Item>

        <Form.Item label="📝 QUEST TITLE">
          <Input
            placeholder="Enter quest title..."
            className="pixel-input"
          />
        </Form.Item>

        <Form.Item label="📋 QUEST DESCRIPTION">
          <TextArea
            placeholder="Describe the quest objectives..."
            className="pixel-textarea"
            rows={4}
          />
        </Form.Item>

        <Form.Item label="⚡ PRIORITY LEVEL">
          <Radio.Group className="pixel-radio-group">
            <Radio value="low">🟢 LOW</Radio>
            <Radio value="medium">🟡 MEDIUM</Radio>
            <Radio value="high">🟠 HIGH</Radio>
            <Radio value="critical">🔴 CRITICAL</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="⏰ DUE DATE">
          <DatePicker className="pixel-datepicker" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// 任務列表顯示
function QuestHistoryTab({ customer }: { customer: Customer }) {
  const [quests, setQuests] = useState<CustomerQuest[]>([]);

  return (
    <div className="quest-history">
      <div className="quest-controls">
        <button
          className="pixel-button create-quest"
          onClick={() => setShowCreateQuest(true)}
        >
          ⚔️ CREATE NEW QUEST
        </button>
      </div>

      <div className="quest-list">
        {quests.map(quest => (
          <div key={quest.id} className={`quest-card ${quest.status}`}>
            <div className="quest-header">
              <span className="quest-type-icon">
                {getQuestTypeIcon(quest.questType)}
              </span>
              <span className="quest-title">{quest.title}</span>
              <span className={`quest-status ${quest.status}`}>
                {quest.status.toUpperCase()}
              </span>
            </div>

            <div className="quest-description">
              {quest.description}
            </div>

            <div className="quest-footer">
              <span className="quest-priority">
                {getPriorityDisplay(quest.priority)}
              </span>
              <span className="quest-due">
                DUE: {formatDate(quest.dueDate)}
              </span>
              <span className="quest-reward">
                REWARD: +{quest.reward} EXP
              </span>
            </div>

            <div className="quest-actions">
              {quest.status === 'active' && (
                <>
                  <button
                    className="pixel-mini-button complete"
                    onClick={() => completeQuest(quest.id)}
                  >
                    ✅ COMPLETE
                  </button>
                  <button
                    className="pixel-mini-button edit"
                    onClick={() => editQuest(quest.id)}
                  >
                    ✏️ EDIT
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 **表格視圖 - 像素化數據表**

```tsx
function PixelTableView() {
  return (
    <div className="pixel-table-container">
      <Table
        className="pixel-table"
        dataSource={customers}
        pagination={{
          showSizeChanger: false,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `SHOWING ${range[0]}-${range[1]} OF ${total} CHARACTERS`
        }}
        columns={[
          {
            title: '🎮 CHARACTER',
            render: (_, record) => (
              <div className="table-character-cell">
                <img
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${record.id}`}
                  className="table-avatar"
                  alt={record.name}
                />
                <div className="character-basic-info">
                  <div className="character-name">{record.name}</div>
                  <div className="character-class">
                    {getCustomerClass(record.type)}
                  </div>
                </div>
              </div>
            )
          },
          {
            title: '⭐ LEVEL',
            render: (_, record) => (
              <span className="level-display">
                LV.{calculateCustomerLevel(record)}
              </span>
            ),
            sorter: (a, b) => calculateCustomerLevel(a) - calculateCustomerLevel(b)
          },
          {
            title: '❤️ FRIENDSHIP',
            render: (_, record) => (
              <div className="friendship-mini">
                <div className="mini-hp-bar">
                  <div
                    className="mini-hp-fill"
                    style={{ width: `${calculateFriendship(record)}%` }}
                  />
                </div>
                <span className="friendship-percent">
                  {calculateFriendship(record)}%
                </span>
              </div>
            ),
            sorter: (a, b) => calculateFriendship(a) - calculateFriendship(b)
          },
          {
            title: '⚡ STATUS',
            render: (_, record) => (
              <span className={`status-tag ${getUrgencyClass(record)}`}>
                {getUrgencyDisplay(record)}
              </span>
            ),
            filters: [
              { text: '🟢 OK', value: 'ok' },
              { text: '🟡 DUE SOON', value: 'due_soon' },
              { text: '🔴 OVERDUE', value: 'overdue' }
            ],
            onFilter: (value, record) => getUrgency(record) === value
          },
          {
            title: '🏆 EXP',
            dataIndex: 'totalAmount',
            render: (amount) => `${amount?.toLocaleString() || 0} EXP`,
            sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0)
          },
          {
            title: '🎯 ACTIONS',
            render: (_, record) => (
              <Space>
                <button
                  className="pixel-mini-button interact"
                  onClick={() => logContact(record.id)}
                >
                  💬 TALK
                </button>
                <button
                  className="pixel-mini-button detail"
                  onClick={() => openCharacterDetail(record)}
                >
                  👁️ VIEW
                </button>
              </Space>
            )
          }
        ]}
      />
    </div>
  );
}
```

---

## 🔊 **音效和動畫效果**

### **遊戲化音效觸發**
```typescript
// 音效管理
class PixelSoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};

  constructor() {
    // 預載常用音效
    this.loadSound('levelup', '/sounds/levelup.wav');
    this.loadSound('click', '/sounds/click.wav');
    this.loadSound('complete', '/sounds/complete.wav');
    this.loadSound('warning', '/sounds/warning.wav');
  }

  loadSound(name: string, url: string) {
    this.sounds[name] = new Audio(url);
  }

  play(name: string) {
    if (this.sounds[name]) {
      this.sounds[name].play().catch(() => {
        // 處理自動播放限制
      });
    }
  }
}

// 在相應操作時觸發音效
const soundManager = new PixelSoundManager();

function logContact(customerId: string) {
  // 執行聯絡記錄
  updateLastContact(customerId);

  // 播放音效
  soundManager.play('complete');

  // 顯示經驗值獲得動畫
  showExpGainAnimation('+50 EXP!');
}

function levelUpCustomer(customerId: string) {
  // 客戶升級邏輯
  upgradeCustomerLevel(customerId);

  // 播放升級音效
  soundManager.play('levelup');

  // 顯示升級動畫
  showLevelUpAnimation('LEVEL UP!');
}
```

### **像素化動畫效果**
```css
/* 經驗值獲得動畫 */
@keyframes expGain {
  0% {
    opacity: 1;
    transform: translateY(0);
    color: #44FF44;
  }
  100% {
    opacity: 0;
    transform: translateY(-50px);
    color: #FFFF44;
  }
}

.exp-gain-animation {
  animation: expGain 2s ease-out forwards;
  position: absolute;
  font-family: var(--pixel-font);
  font-size: 18px;
  font-weight: bold;
  pointer-events: none;
  text-shadow: 2px 2px 0px black;
}

/* 升級動畫 */
@keyframes levelUp {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.level-up-animation {
  animation: levelUp 1s ease-in-out 3;
  color: #FFD700;
  text-shadow: 4px 4px 0px black;
}

/* 脈衝效果（緊急客戶） */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

---

## ⚙️ **整合到現有系統**

### **與客戶模組整合**
- 擴展現有Customer模型，增加遊戲化屬性
- 客戶等級、成就、任務歷史等資料
- 保持原有CRM功能，增加遊戲化介面

### **與銷售模組整合**
- 購買行為轉換為經驗值和成就
- 交易歷史顯示為任務完成記錄

### **權限控制**
- 投資方看不到完整的遊戲化數據
- 保持商業機密的數據隔離

**這個像素風格CRM將為酒類貿易系統增添趣味性，提升使用者體驗！** 🎮