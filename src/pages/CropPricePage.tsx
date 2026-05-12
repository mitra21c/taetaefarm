import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { getCropPrices, saveCropPrices, type CropPrice } from '../api/auth';
import styles from './CropPricePage.module.css';

const CROP_DISPLAY: Record<string, string> = {
  블루베리: '블루베리',
  태추: '태추 단감',
  대봉: '대봉',
  울금: '울금',
  '감 말랭이': '감 말랭이',
};

export default function CropPricePage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CropPrice[] | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    navigate('/farm', { replace: true });
    return null;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crop-prices'],
    queryFn: getCropPrices,
    staleTime: 0,
  });

  const prices: CropPrice[] = draft ?? data ?? [];

  const mutation = useMutation({
    mutationFn: saveCropPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-prices'] });
      setDraft(null);
      setSaveMsg('저장되었습니다.');
      setTimeout(() => setSaveMsg(''), 2500);
    },
  });

  const handleChange = (
    cropName: string,
    field: keyof Omit<CropPrice, 'crop_name'>,
    value: string,
  ) => {
    const base = draft ?? data ?? [];
    setDraft(
      base.map(p =>
        p.crop_name === cropName
          ? {
              ...p,
              [field]: field === 'available' ? value : field === 'price' ? parseInt(value, 10) || 0 : parseFloat(value) || 0,
            }
          : p,
      ),
    );
    setSaveMsg('');
  };

  const handleSave = () => {
    if (!draft) return;
    mutation.mutate(draft);
  };

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <h1 className={styles.title}>작물 가격</h1>

        {isLoading && <p className={styles.status}>불러오는 중…</p>}
        {isError && <p className={styles.statusError}>데이터를 불러오지 못했습니다.</p>}

        {!isLoading && prices.length > 0 && (
          <>
            <div className={styles.table}>
              <div className={styles.thead}>
                <span className={styles.colName}>작물</span>
                <span className={styles.colWeight}>무게 (Kg)</span>
                <span className={styles.colPrice}>가격 (원)</span>
                <span className={styles.colAvail}>구매 가능</span>
              </div>

              {prices.map(p => (
                <div key={p.crop_name} className={styles.row}>
                  <span className={styles.colName}>
                    {CROP_DISPLAY[p.crop_name] ?? p.crop_name}
                  </span>

                  <span className={styles.colWeight}>
                    <input
                      className={styles.numInput}
                      type="number"
                      min={0}
                      step={0.1}
                      value={p.weight}
                      onChange={e => handleChange(p.crop_name, 'weight', e.target.value)}
                    />
                  </span>

                  <span className={styles.colPrice}>
                    <input
                      className={styles.numInput}
                      type="number"
                      min={0}
                      step={100}
                      value={p.price}
                      onChange={e => handleChange(p.crop_name, 'price', e.target.value)}
                    />
                  </span>

                  <span className={styles.colAvail}>
                    <label className={`${styles.toggle} ${p.available === 'Y' ? styles.toggleOn : ''}`}>
                      <input
                        type="checkbox"
                        checked={p.available === 'Y'}
                        onChange={e =>
                          handleChange(p.crop_name, 'available', e.target.checked ? 'Y' : 'N')
                        }
                      />
                      <span className={styles.toggleTrack}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleLabel}>
                        {p.available === 'Y' ? 'Y' : 'N'}
                      </span>
                    </label>
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
              {mutation.isError && (
                <span className={styles.saveError}>저장에 실패했습니다.</span>
              )}
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!draft || mutation.isPending}
              >
                {mutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
