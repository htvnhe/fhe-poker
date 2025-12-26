import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export function LocaleSwitch() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: 'cn' },
    { code: 'en-US', name: 'English', flag: 'en' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 语言切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-all duration-200 backdrop-blur-sm"
      >
        <span className="text-2xl">{currentLanguage.flag}</span>
        <span className="text-white font-medium hidden sm:inline">{currentLanguage.name}</span>
        <svg
          className={`w-4 h-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 菜单内容 - 向左展开以避免被浏览器边缘裁剪 */}
          <div style={{ position: 'absolute', right: '0', marginTop: '0.5rem', width: '220px', minWidth: '220px' }} className="bg-slate-800 rounded-lg shadow-2xl border border-white/20 overflow-hidden z-20 backdrop-blur-lg">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
                  ${i18n.language === lang.code
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : 'text-white hover:bg-white/10'
                  }
                `}
              >
                
                <span>{lang.name}</span>
                {i18n.language === lang.code && (
                  <svg style={{ width: '16px', height: '16px' }} className="ml-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

