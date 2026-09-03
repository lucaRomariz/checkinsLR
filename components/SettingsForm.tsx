'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Profile, SystemSetting } from '@/lib/types';

function toMap(settings: SystemSetting[]) {
  return Object.fromEntries(settings.map((s) => [s.setting_key, s.setting_value]));
}

export default function SettingsForm({
  initialSettings,
  initialCategories,
  admins,
}: {
  initialSettings: SystemSetting[];
  initialCategories: Category[];
  admins: Profile[];
}) {
  const supabase = createClient();
  const [settings, setSettings] = useState(toMap(initialSettings));
  const [categories, setCategories] = useState(initialCategories);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function saveSetting(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(key);
    await supabase.from('system_settings').upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
    setSaving(null);
    setSavedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  async function saveCategory(cat: Category, patch: Partial<Category>) {
    const updated = { ...cat, ...patch };
    setCategories((cs) => cs.map((c) => (c.id === cat.id ? updated : c)));
    setSaving(cat.id);
    await supabase.from('categories').update(patch).eq('id', cat.id);
    setSaving(null);
    setSavedAt(new Date().toLocaleTimeString('pt-BR'));
  }

  const bool = (v: string | undefined) => v === 'true';

  return (
    <div className="space-y-8 px-4 py-5">
      {savedAt && <p className="text-xs text-muted">Salvo às {savedAt}</p>}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Check-ins</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
            <span className="text-sm">Postagens máximas por dia</span>
            <input
              type="number"
              min={1}
              className="w-16 rounded-lg px-2 py-1 text-center text-sm"
              defaultValue={settings.daily_post_limit ?? '2'}
              onBlur={(e) => saveSetting('daily_post_limit', e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
            <span className="text-sm">Check-ins válidos para ranking / dia</span>
            <input
              type="number"
              min={1}
              className="w-16 rounded-lg px-2 py-1 text-center text-sm"
              defaultValue={settings.daily_ranking_limit ?? '1'}
              onBlur={(e) => saveSetting('daily_ranking_limit', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Ranking</h2>
        <div className="space-y-3">
          <ToggleRow
            label="Ranking ativado"
            checked={bool(settings.ranking_enabled)}
            onChange={(v) => saveSetting('ranking_enabled', String(v))}
          />
          <ToggleRow
            label="Ranking por categoria"
            checked={bool(settings.ranking_by_category)}
            onChange={(v) => saveSetting('ranking_by_category', String(v))}
          />
          <label className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
            <span className="text-sm">Período padrão</span>
            <select
              className="rounded-lg px-2 py-1 text-sm"
              defaultValue={settings.ranking_default_period ?? 'week'}
              onChange={(e) => saveSetting('ranking_default_period', e.target.value)}
            >
              <option value="today">Hoje</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="all">Geral</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Categorias</h2>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl bg-surface px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {c.icon} {c.name}
                </span>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => saveCategory(c, { active: e.target.checked })}
                  />
                  Ativa
                </label>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Limite diário</span>
                <input
                  type="number"
                  min={1}
                  className="w-14 rounded-lg px-2 py-1 text-center"
                  defaultValue={c.daily_limit ?? ''}
                  placeholder="—"
                  onBlur={(e) =>
                    saveCategory(c, { daily_limit: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>Conta para ranking</span>
                <input
                  type="checkbox"
                  checked={c.ranking_enabled}
                  onChange={(e) => saveCategory(c, { ranking_enabled: e.target.checked })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Social</h2>
        <div className="space-y-3">
          <ToggleRow
            label="Curtidas"
            checked={bool(settings.likes_enabled)}
            onChange={(v) => saveSetting('likes_enabled', String(v))}
          />
          <ToggleRow
            label="Comentários"
            checked={bool(settings.comments_enabled)}
            onChange={(v) => saveSetting('comments_enabled', String(v))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Administração</h2>
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-sm">
              <span>{a.display_name}</span>
              <span className="text-xs text-muted">ADMIN</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
