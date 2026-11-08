'use client';

import { useState } from 'react';
import { ChefHat, Leaf, Sprout, Utensils } from 'lucide-react';
import './landing.css';

// Illustrative numbers only. They explain how a kitchen plans a day; they are
// not pilot results and not a forecast.
const WALKIN_ESTIMATE = 20; // average of the last seven days in the example
const BUFFER = 2;
const ACTUAL_WALKIN = 18; // what really turns up today in the example
const GUESS = 60; // "cook by feel" habit
const NORMAL_PRICE = 15000;
const PROMO_PRICE = 9000;
const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export function PlanSimulator() {
  const [orders, setOrders] = useState(24);
  const planned = orders + WALKIN_ESTIMATE + BUFFER;
  const demand = orders + ACTUAL_WALKIN;
  const guessLeft = Math.max(0, GUESS - demand);
  const plannedLeft = Math.max(0, planned - demand);
  const max = Math.max(GUESS, planned);

  return (
    <div className="plan-sim" aria-labelledby="plan-sim-title">
      <div className="plan-sim-top">
        <span className="plan-sim-mark">
          <ChefHat size={19} />
        </span>
        <span>SIMULASI SEHARI DI KANTIN</span>
        <span className="demo-tag">Contoh angka</span>
      </div>
      <h4 id="plan-sim-title">Gerai harus masak berapa porsi?</h4>
      <p className="plan-sim-lead">
        Geser jumlah pesanan yang sudah masuk. PORSI LOOP menjumlahkannya dengan perkiraan
        pembeli langsung dan sedikit cadangan, jadi gerai tahu berapa yang perlu dimasak.
      </p>

      <label className="plan-sim-slider">
        <span>
          Pesanan masuk <strong>{orders} porsi</strong>
        </span>
        <input
          type="range"
          min="0"
          max="40"
          value={orders}
          aria-label="Jumlah pesanan masuk pada simulasi"
          onChange={(e) => setOrders(Number(e.target.value))}
        />
      </label>

      <div className="plan-sim-sum" role="group" aria-label="Rumus rencana masak">
        <div>
          <strong>{orders}</strong>
          <span>Pesanan masuk</span>
        </div>
        <i>+</i>
        <div>
          <strong>{WALKIN_ESTIMATE}</strong>
          <span>Perkiraan beli langsung</span>
        </div>
        <i>+</i>
        <div>
          <strong>{BUFFER}</strong>
          <span>Cadangan</span>
        </div>
        <i>=</i>
        <div className="plan-sim-total">
          <strong>{planned}</strong>
          <span>Porsi dimasak</span>
        </div>
      </div>

      <div className="plan-sim-compare">
        <p>
          Misalnya hari ini yang datang beli langsung ternyata {ACTUAL_WALKIN} orang. Total
          yang laku: <strong>{demand} porsi</strong>.
        </p>
        {[
          { label: 'Masak kira-kira', cooked: GUESS, left: guessLeft, tone: 'guess' },
          { label: 'Masak dengan rencana', cooked: planned, left: plannedLeft, tone: 'plan' },
        ].map((row) => (
          <div key={row.label} className={`plan-sim-row plan-sim-${row.tone}`}>
            <div className="plan-sim-row-head">
              <span>{row.label}</span>
              <span>
                dimasak <strong>{row.cooked}</strong> · sisa <strong>{row.left}</strong>
              </span>
            </div>
            <div
              className="plan-sim-bar"
              role="img"
              aria-label={`${row.label}: ${row.cooked} porsi dimasak, ${row.left} sisa`}
            >
              <span style={{ width: `${((row.cooked - row.left) / max) * 100}%` }} />
              <span style={{ width: `${(row.left / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="plan-sim-legend" aria-hidden="true">
          <span>
            <i className="sold" /> Laku
          </span>
          <span>
            <i className="left" /> Sisa
          </span>
        </div>
      </div>

      <div className="plan-sim-promo">
        <span>
          <Sprout size={22} />
        </span>
        <p>
          {plannedLeft > 0 ? (
            <>
              Sisa <strong>{plannedLeft} porsi</strong> yang masih layak tidak dibuang. Gerai
              menawarkannya sebagai <strong>Promo Terbatas</strong>:{' '}
              <strong>{rupiah(PROMO_PRICE)}</strong> dari {rupiah(NORMAL_PRICE)}, dengan batas
              waktu ambil yang jelas.
            </>
          ) : (
            <>Tidak ada sisa pada skenario ini. Bila nanti ada, gerai menawarkannya sebagai Promo Terbatas.</>
          )}
        </p>
      </div>
      <p className="plan-sim-foot">
        <Utensils size={13} /> <Leaf size={13} /> Contoh untuk menjelaskan cara kerja, bukan hasil
        pilot dan bukan prediksi AI. Saran produksi selalu bisa diubah gerai.
      </p>
    </div>
  );
}
