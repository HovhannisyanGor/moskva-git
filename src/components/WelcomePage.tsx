interface Props {
  onStart: () => void;
}

export default function WelcomePage({ onStart }: Props) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-w">

        <div className="welcome-hero">
          <div className="welcome-logo-row">
            <div className="welcome-logo-box">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M-4 5 Q12 14 8 24 Q4 32 16 38" stroke="#22303E" strokeWidth="3.5" strokeLinecap="round" opacity="0.55"/>
                <g stroke="#241C1A" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round">
                  <path d="M-2 13 L38 11"/><path d="M-2 27 L38 29"/>
                  <path d="M14 -2 L13 38"/><path d="M28 -2 L29 38"/>
                </g>
                <circle cx="24" cy="24" r="7.5" fill="none" stroke="#FF3B30" strokeWidth="1" opacity="0.28"/>
                <circle cx="24" cy="24" r="5" fill="none" stroke="#FF3B30" strokeWidth="1" opacity="0.48"/>
                <path d="M12 10 L12 24 L24 24" stroke="#FF3B30" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="10" r="3.8" fill="#FF3B30"/>
                <circle cx="24" cy="24" r="3.4" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="welcome-wordmark">localee</div>
              <div className="welcome-tagline">исследуй город умно</div>
            </div>
          </div>

          <h1 className="welcome-h1">Твой персональный<br />гид по городу</h1>
          <p className="welcome-p">AI строит маршрут под тебя — по интересам, времени и бюджету. Отмечай места, собирай достижения, гуляй с друзьями.</p>

          <div className="welcome-cta-row">
            <button className="welcome-btn-main" onClick={onStart}>Открыть карту</button>
            <button className="welcome-btn-ghost" onClick={() => document.getElementById('welcome-how')?.scrollIntoView({ behavior: 'smooth' })}>Как это работает</button>
          </div>
        </div>

        <div className="welcome-divider" />

        <div className="welcome-features">
          <div className="welcome-feat">
            <i className="ti ti-sparkles welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">AI-маршруты</h3>
              <p className="welcome-feat-p">Опиши что хочешь — получи готовый маршрут с точками на карте</p>
            </div>
          </div>
          <div className="welcome-feat">
            <i className="ti ti-trophy welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">Достижения</h3>
              <p className="welcome-feat-p">Открывай бейджи и следи за тем сколько города уже исследовал</p>
            </div>
          </div>
          <div className="welcome-feat">
            <i className="ti ti-current-location welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">Авто-ачивки</h3>
              <p className="welcome-feat-p">Посещение засчитывается автоматически когда ты рядом с местом</p>
            </div>
          </div>
          <div className="welcome-feat">
            <i className="ti ti-users welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">Друзья и группы</h3>
              <p className="welcome-feat-p">Планируй прогулки вместе — чаты, совместные маршруты, сравнение ачивок</p>
            </div>
          </div>
          <div className="welcome-feat">
            <i className="ti ti-heart welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">Избранное</h3>
              <p className="welcome-feat-p">Сохраняй места которые понравились и возвращайся к ним</p>
            </div>
          </div>
          <div className="welcome-feat">
            <i className="ti ti-building-store welcome-feat-icon" aria-hidden="true" />
            <div>
              <h3 className="welcome-feat-h3">Все заведения</h3>
              <p className="welcome-feat-p">Рестораны, кальянные, музеи, парки — всё на одной карте</p>
            </div>
          </div>
        </div>

        <div className="welcome-divider" />

        <div className="welcome-how" id="welcome-how">
          <div style={{ paddingTop: 28 }}>
            <div className="welcome-section-label">Как это работает</div>
            <div className="welcome-steps">
              <div className="welcome-step">
                <div className="welcome-step-n">01</div>
                <div>
                  <h4 className="welcome-step-h4">Задай параметры</h4>
                  <p className="welcome-step-p">Время, компания, бюджет, интересы — всё через простые фильтры или текстом</p>
                </div>
              </div>
              <div className="welcome-step">
                <div className="welcome-step-n">02</div>
                <div>
                  <h4 className="welcome-step-h4">AI строит маршрут</h4>
                  <p className="welcome-step-p">Получаешь готовый список мест с советами, ценами и кнопкой купить билет</p>
                </div>
              </div>
              <div className="welcome-step">
                <div className="welcome-step-n">03</div>
                <div>
                  <h4 className="welcome-step-h4">Гуляй и собирай ачивки</h4>
                  <p className="welcome-step-p">Система сама засчитает посещение и разблокирует достижения по геолокации</p>
                </div>
              </div>
              <div className="welcome-step">
                <div className="welcome-step-n">04</div>
                <div>
                  <h4 className="welcome-step-h4">Делись с друзьями</h4>
                  <p className="welcome-step-p">Зови в группу, планируйте вместе в чате и соревнуйтесь в достижениях</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-cities">
          <span className="welcome-cities-label">Города</span>
          <span className="welcome-chip welcome-chip--on">Москва</span>
          <span className="welcome-chip">Питер — скоро</span>
          <span className="welcome-chip">Казань — скоро</span>
          <span className="welcome-chip">Вся Россия — в планах</span>
        </div>

        <div className="welcome-foot">
          <p className="welcome-foot-p">Готов? Карта уже ждёт.</p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button className="welcome-skip" onClick={onStart}>Пропустить</button>
            <button className="welcome-btn-main" onClick={onStart}>Начать →</button>
          </div>
        </div>

      </div>
    </div>
  );
}
