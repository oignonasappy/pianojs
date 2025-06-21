"use strict";

/**
 * 最も普遍的な基本周波数
 */
const STANDARD_TUNING = 440;

/**
 * 12平均律における1オクターブの音階数
 */
const OCTAVE_NUM = 12;

const C4_MIDI = 60;
const A4_MIDI = 69;

/**
 * piano-play用の再生機能
 */
const pianoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
/**
 * piano-play用の再生中リスト
 */
const pianoActiveNotes = new Map();

/**
 * マウス入力の状態管理
 * piano-playのクリックの状態を整理するために使用する
 */
let pianoMouseDown = false;
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) pianoMouseDown = true;
});
document.addEventListener('mouseup', (e) => {
    pianoMouseDown = false;
})

// AudioContextのアクティブ化
document.addEventListener('click', () => {
    if (pianoAudioCtx.state === 'suspended') {
        pianoAudioCtx.resume();
    }
});

// 初期読み込み
pianoLoad();

/**
 * 全てのピアノを読み込む処理
 * 複数回の呼び出しが可能
 */
function pianoLoad() {
    // 全てのpianoに対し処理
    const pianos = document.querySelectorAll('div.piano, div.piano-hover, div.piano-play');
    pianos.forEach(piano => {
        if (piano.loaded) return;
        piano.loaded = true;
        /* 属性 */
        // ユーザー設定か || デフォルト
        piano.first = parseInt(piano.dataset.first) || C4_MIDI;
        piano.last = parseInt(piano.dataset.last) || piano.first + OCTAVE_NUM;
        piano.keyWidth = piano.dataset.keyWidth ?? '20px';
        piano.keyHeight = piano.dataset.keyHeight ?? '60px';
        piano.highlight = piano.dataset.highlight === undefined ? undefined
            : piano.dataset.highlight.trim().split(/\s+/).map(n => parseInt(n));
        piano.highlightColor = piano.dataset.highlightColor ?? '#FFE0E0';
        piano.notename = piano.dataset.notename === "true" ? true : false;
        piano.keySignature = piano.dataset.keySignature ?? 'C';
        piano.customNotename = piano.dataset.customNotename;
        // .piano-play, playKeys(), playHighlighted()で使用
        piano.volume = parseFloat(piano.dataset.volume) || 0.25;
        piano.duration = parseFloat(piano.dataset.duration) || 2;
        piano.oscType = piano.dataset.oscType || 'triangle';
        piano.tuning = parseFloat(piano.dataset.tuning) || STANDARD_TUNING;
        // custom-notenameのパース
        piano.customNameMap = new Map();
        if (piano.customNotename != undefined) {
            // カンマ区切り ->
            piano.customNotename.split(',').forEach(pair => {
                // -> スペース区切り
                const [midiNum, name] = pair.trim().split(/\s+/);
                piano.customNameMap.set(parseInt(midiNum), name);
            });
        }

        // timeoutを伴うアニメーションのフラグ
        piano.animationValidFlgs = [];

        // ピアノのCSS
        piano.style.position = 'relative';
        piano.style.height = piano.keyHeight;
        // piano.style.backgroundColor = '#202020';

        // スクロール用にコンテナでラップする
        const wrapper = document.createElement('div');
        wrapper.className = 'piano-wrapper';
        wrapper.style.boxSizing = 'border-box';
        wrapper.style.overflowX = 'auto';
        wrapper.style.overflowY = 'hidden';
        wrapper.style.width = 'max-content';
        wrapper.style.maxWidth = '100%';
        wrapper.style.padding = '4px';
        wrapper.style.borderRadius = '8px';
        // wrapper.style.background = '#E0E0E0';
        piano.parentNode.insertBefore(wrapper, piano);
        wrapper.appendChild(piano);

        // 白鍵の数。鍵盤の位置を決定するために使用する
        let whiteCount = 0;
        // 鍵盤のHTMLElementを保存する領域
        piano.keys = {};
        /* 鍵盤一つづつを作成する処理 */
        for (let midi = piano.first; midi <= piano.last; midi++) {

            // 鍵盤はそれぞれ<div>で構成
            const key = document.createElement('div');
            piano.keys[midi] = key;
            key.dataset.midi = midi;
            piano.animationValidFlgs[midi] = true;

            // 鍵盤共通のCSS
            key.style.position = 'absolute';
            key.style.transition = 'filter 50ms ease-out, background-color 50ms ease-out';

            if (!isBlackKey(midi)) {
                // 白鍵の処理
                key.className = 'white-key';
                key.style.width = piano.keyWidth;
                key.style.height = piano.keyHeight;
                key.style.left = `calc(${piano.keyWidth} * ${whiteCount})`;
                key.style.backgroundColor = '#FFFFFF';
                key.style.border = '1px solid #202020';
                key.style.zIndex = 0;

                // ハイライトされる鍵盤
                if (piano.highlight !== undefined && piano.highlight.includes(midi)) {
                    key.style.backgroundColor = piano.highlightColor;
                }

                whiteCount++;
            } else {
                // 黒鍵の処理
                // 最初の鍵盤が黒鍵だった場合、最初の黒鍵が左側にずれることを防ぐ
                if (whiteCount === 0) whiteCount = 1;
                key.className = 'black-key';
                key.style.width = `calc(${piano.keyWidth} * 0.7)`;
                key.style.height = `calc(${piano.keyHeight} * 0.6)`;
                key.style.left = `calc(${piano.keyWidth} * ${whiteCount} - ${piano.keyWidth} * 0.35)`;
                key.style.backgroundColor = '#000000';
                key.style.border = '2px solid #606060';
                key.style.zIndex = 1;

                // ハイライトされる鍵盤
                if (piano.highlight !== undefined && piano.highlight.includes(midi)) {
                    key.style.backgroundColor = piano.highlightColor;
                    key.style.filter = 'brightness(55%) contrast(300%)';
                }
            }

            // 音名を鍵盤に追加
            const label = document.createElement('div');
            label.className = 'key-label';
            label.style.position = 'absolute';
            label.style.bottom = `calc(${piano.keyHeight} / 30 + 2px)`;
            label.style.width = '100%';
            label.style.fontFamily = 'monospace';
            label.style.textAlign = 'center';
            label.style.fontSize = `calc(${piano.keyWidth} / 2 - 1px)`;
            label.style.pointerEvents = 'none';
            label.style.userSelect = 'none';
            if (piano.notename) {
                if (!isBlackKey(midi)) {
                    // 白鍵の処理
                    label.innerText = midiToNoteName(midi, piano.keySignature);
                    label.style.color = '#404040';
                } else {
                    // 黒鍵の処理
                    label.innerText = midiToNoteName(midi, piano.keySignature, false);
                    label.style.color = '#C0C0C0';
                }
            }
            // カスタムな音名の設定
            if (piano.customNameMap.has(midi)) {
                label.innerText = piano.customNameMap.get(midi);
            }
            key.appendChild(label);

            /* piano-hover */
            if (piano.classList.contains('piano-hover')) {
                // 侵入時
                key.addEventListener('mouseover', () => {
                    key.style.filter = 'invert(20%)';
                });
                // 退出時
                key.addEventListener('mouseleave', () => {
                    key.style.filter = '';
                    // ハイライトのfilterを元に戻す
                    if (isBlackKey(midi) && piano.highlight !== undefined && piano.highlight.includes(midi)) {
                        key.style.filter = 'brightness(55%) contrast(300%)';
                    }
                });
            }

            /* piano-play */
            if (piano.classList.contains('piano-play')) {
                // カーソル変化
                key.style.cursor = 'pointer';
                // 侵入時
                key.addEventListener('mouseover', () => {
                    if (pianoMouseDown) {
                        key.style.filter = 'invert(40%)';
                        playNote(midi, piano.volume, piano.duration, piano.oscType, piano.tuning);
                    } else {
                        key.style.filter = 'invert(20%)';
                    }
                });
                // 侵入かつ左クリック時
                key.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    if (e.button !== 0) return;
                    key.style.filter = 'invert(40%)';
                    stopNote(midi);
                    playNote(midi, piano.volume, piano.duration, piano.oscType, piano.tuning);
                });
                // 退出時
                key.addEventListener('mouseleave', () => {
                    key.style.filter = '';
                    // ハイライトのfilterを元に戻す
                    if (isBlackKey(midi) && piano.highlight !== undefined && piano.highlight.includes(midi)) {
                        key.style.filter = 'brightness(55%) contrast(300%)';
                    }
                });
                // 左クリック開放時
                key.addEventListener('mouseup', () => {
                    key.style.filter = 'invert(20%)';
                });
            }

            // ピアノの横幅を鍵盤数に合わせる
            piano.style.width = `calc(${piano.keyWidth} * ${whiteCount})`;

            // ピアノに鍵盤を追加
            piano.appendChild(key);
        }
    });
}

/**
 * そのmidiが黒鍵であるか判定する。
 * @param {number} midi 
 * @returns true | false
 */
function isBlackKey(midi) {
    const blackNotes = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
    return blackNotes.includes(midi % OCTAVE_NUM);
}

/**
 * @description
 * midi番号と調性(省略可)を引数にとり、音名に臨時記号とオクターブを付加した文字列を返す。
 * 臨時記号は調性に則って付加する。調性に当てはまらない黒鍵の音は#を付加する。
 * ここでは、調号が6個つく嬰ヘ長調は変ト長調とする。
 * @example 引数の例:
 * midiToNoteName(60, 'C maj') // C4
 * midiToNoteName(66, 'Cb LYD') // Gb4
 * @example 調性の記述例:
 * リディアン : 'lyd'
 * メジャー | イオニアン : 'maj' | 'lon'
 * ミクソリディアン : 'mix'
 * ドリアン : 'dor'
 * マイナー | エオリアン : 'min' | 'aeo'
 * フリジアン : 'phr'
 * ロクリアン : 'loc'
 * @param {number} midi midiノート番号(0以上)
 * @param {string} [keySignature] 音名、スケールをスペース区切りで渡す。音名のシャープは'#'で表し、フラットはb'で表す。省略された場合や、フォーマットが間違っている場合は、'C'に置き換える。スケールは教会旋法の主要な7モードから選択し、頭3文字を渡す。省略された場合や、フォーマットが間違っている場合は'maj'に置き換える。
 * @param {boolean} [hasOctave] オクターブを表記するか。デフォルトはtrue
 * @returns {string} 音名。黒鍵の場合スケールに則った臨時記号を付ける。もしくは#を付ける。
 */
function midiToNoteName(midi, keySignature = 'C maj', hasOctave = true) {
    // メジャースケールの場合の調号の数(# := +, b := -)
    // フラットbが大文字Bになっていることに注意
    const KEY_SIG_MAJ = {
        'C': 0, 'B#': 0,
        'C#': -5, 'DB': -5,
        'D': 2,
        'D#': -3, 'EB': -3,
        'E': 4, 'FB': 4,
        'F': -1, 'E#': -1,
        'F#': -6, 'GB': -6,
        'G': 1,
        'G#': -4, 'AB': -4,
        'A': 3,
        'A#': -2, 'BB': -2,
        'B': 5, 'CB': 5
    };
    // モード毎の調号の変動数(フラット方向に増えた数)
    const MODES_FLATNUM = {
        'LYD': -1,
        'MAJ': 0, 'ION': 0,
        'MIX': 1,
        'DOR': 2,
        'MIN': 3, 'AEO': 3,
        'PHR': 4,
        'LOC': 5
    };
    // 調号のフラットの数に対応して#をbにしたリスト
    // 既定の#から変動
    const TONALITY_LIST_FLAT = [
        ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
        ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
        ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
        ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
        ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb'],
    ];

    // keySignature入力チェック
    if (keySignature == 0) {
        keySignature = 'C maj';
    }
    // スペースで区切る
    keySignature = keySignature.trim().split(/\s+/);
    // keySignature入力チェック(音名)
    if (keySignature[0] != undefined) {
        keySignature[0] = keySignature[0].toUpperCase();
    } else {
        keySignature[0] = 'C';
    }
    if (!Object.prototype.hasOwnProperty.call(KEY_SIG_MAJ, keySignature[0])) {
        keySignature[0] = 'C';
    }

    // keySignature入力チェック(調性)
    if (keySignature[1] != undefined) {
        keySignature[1] = keySignature[1].toUpperCase();
    } else {
        keySignature[1] = 'MAJ';
    }
    if (!Object.prototype.hasOwnProperty.call(MODES_FLATNUM, keySignature[1])) {
        keySignature[1] = 'MAJ';
    }

    // bを付加する数・位置を決める
    let tonality = -KEY_SIG_MAJ[keySignature[0]];
    tonality += MODES_FLATNUM[keySignature[1]];
    if (tonality <= -6) tonality += OCTAVE_NUM;
    if (tonality < 0 || 6 < tonality) tonality = 0;

    // オクターブを計算し返す
    if (hasOctave) {
        const octave = Math.floor(midi / OCTAVE_NUM) - 1;
        return TONALITY_LIST_FLAT[tonality][Math.round(midi) % OCTAVE_NUM] + octave;
    }
    return TONALITY_LIST_FLAT[tonality][Math.round(midi) % OCTAVE_NUM];
}

/**
 * 与えられたHzに相当するmidi番号を返します。
 * 結果が小数になる場合も丸めず返します。
 * 
 * 引数が負の値の場合NaNを返します。
 * 
 * @param {number} hz midi番号に変換される周波数
 * @param {number} [tuning] 基本周波数
 * 
 * @returns {number} midi番号
 */
function hzToMidi(hz, tuning = STANDARD_TUNING) {
    if (hz <= 0 || tuning <= 0) {
        return NaN;
    }
    return A4_MIDI + OCTAVE_NUM * Math.log2(hz / tuning);
}

/**
 * 指定したmidiを再生する。
 * ピアノと紐づける必要はない。
 * @param {*} midi 
 * @param {*} volume 
 * @param {*} duration 
 * @param {*} oscType 
 * @param {*} tuning 
 */
function playNote(midi, volume = 0.25, duration = 2, oscType = "triangle", tuning = STANDARD_TUNING) {
    // 同じ番号の既存の音を止める
    stopNote(midi);

    // volumeを対数スケールにする
    volume = Math.pow(10, (-40 + 40 * volume) / 20);

    // 基本設定
    const freq = tuning * Math.pow(2, (midi - A4_MIDI) / OCTAVE_NUM);
    const osc = pianoAudioCtx.createOscillator();
    const gain = pianoAudioCtx.createGain();

    // 正弦波
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, pianoAudioCtx.currentTime);

    // 音量を0に近い値から
    gain.gain.setValueAtTime(0.0001, pianoAudioCtx.currentTime);
    // 滑らかに目標音量volumeへ
    gain.gain.exponentialRampToValueAtTime(volume, pianoAudioCtx.currentTime + 0.02);
    // 音量を時間durationをかけて減少させる
    gain.gain.exponentialRampToValueAtTime(0.0001, pianoAudioCtx.currentTime + duration);

    // 基本設定 開始、終了
    osc.connect(gain).connect(pianoAudioCtx.destination);
    osc.start();
    osc.stop(pianoAudioCtx.currentTime + duration);

    // 強制停止時の処理の為にgainを渡す
    osc.gainNode = gain;

    // 再生中リストへ追加
    pianoActiveNotes.set(midi, osc);
}

/**
 * 配列の全てのmidiに対してplayNote()を呼び出す。
 */
function playNoteAll(midiArray, volume = 0.25, duration = 2, oscType = "triangle", tuning = STANDARD_TUNING) {
    midiArray.forEach(midi => {
        playNote(midi, volume, duration, oscType, tuning);
    });
}

/**
 * 強制的に音を止める。
 */
function stopNote(midi) {
    const osc = pianoActiveNotes.get(midi);
    if (osc) {
        try {
            // 強制停止時のノイズ処理(滑らかに位相を0にする)
            const now = pianoAudioCtx.currentTime;
            const gainNode = osc.gainNode;
            if (gainNode) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            }
            osc.stop(now + 0.04);
        } catch (e) { }
        // 再生中リストから削除
        pianoActiveNotes.delete(midi);
    }
}

/**
 * ピアノに設定されているデータ属性を使用してplayNote()を呼び出す。
 * 再生された鍵盤は発光する。
 * @param {string} id HTMlに設定したid
 * @param {Array} midiArray 再生するmidiが列挙された配列
 */
function playKeys(id, midiArray) {
    const piano = document.getElementById(id);
    if (piano == undefined) {
        console.error("id not found");
        return;
    }

    // midiArrayの全てのmidiに対してplayNote()を呼び出す
    // ピアノの鍵盤を短時間光らせる
    midiArray.forEach(midi => {
        playNote(midi, piano.volume, piano.duration, piano.oscType, piano.tuning);

        // アニメーションの途中で再び再生することはできない
        // (animationDurationより短い間隔で再生することはできない)
        const animationDuration = 150;
        // midi番号が小数で与えられた場合、最も近い鍵盤を発光させる
        // (主に、2つの単純な周波数比になる音の干渉を防ぐ意図による、僅かなずらしの考慮解釈)
        const nearKey = Math.round(midi);
        if (piano.keys[nearKey] != undefined && piano.animationValidFlgs[nearKey]) {
            piano.animationValidFlgs[nearKey] = false;
            const beforeTransition = piano.keys[nearKey].style.transition;
            const beforefilter = piano.keys[nearKey].style.filter;
            piano.keys[nearKey].style.transition = '';
            piano.keys[nearKey].style.filter = beforefilter + ' sepia(100%) invert(30%)';
            setTimeout(() => {
                piano.keys[nearKey].style.transition = beforeTransition;
                piano.keys[nearKey].style.filter = beforefilter;
                piano.animationValidFlgs[nearKey] = true;
            }, animationDuration);
        }
    });
}

/**
 * ハイライトされた鍵盤でplayKeys()を呼び出す。
 * @param {*} id 
 */
function playHighlighted(id) {
    const piano = document.getElementById(id);
    if (piano == undefined) {
        console.error("id not found");
        return;
    }
    if (piano.highlight == undefined) {
        console.error("data-highlight has no valid value");
        return;
    }

    // ハイライトされているmidiの配列を渡す
    playKeys(id, piano.highlight);
}

const seqIdAllowFlg = new Set();
/**
 * タイミング(リズム)に合わせてコールバック関数を実行する。
 * 
 * @param {Function} callback 1つ前の実行からsequence[i-1]の間待機して実行される関数。この関数には引数としてvalues[i]が渡される。
 * @param {Array} sequence 次のcallbackの実行までの待機時間の配列。valuesと要素数が等しい、もしくは要素数-1である必要がある。
 * @param {Array} values callbackに渡される値の配列。sequenceと要素数が等しい、もしくは要素数+1である必要がある。
 * @param {number} [bpm=240] sequence[]に設定されている値の1を全音符、1/4を1拍とした時のBPM。
 * @param {any} [seqId=undefined] 同一のIdは重ねて呼び出しができない。未設定の場合は重複した呼び出しが可能。
 */
function sequencer(callback, sequence, values, bpm = 240, seqId = undefined) {
    // sequenceとvaluesは完全に1対1で対応している必要がある
    // sequenceの最後の値は意味をなさないため省略できる
    if (sequence.length !== values.length && sequence.length + 1 !== values.length) {
        throw new Error("The length of sequence and values are did not match");
    }

    // 同一Idの重複呼び出しをロック
    if (seqId != undefined) {
        if (seqIdAllowFlg.has(seqId)) {
            return;
        }
        seqIdAllowFlg.add(seqId);
    }

    // 全てのvalues[i]をsequence[0:i]の遅延で呼び出す
    let totalTime = 0;
    for (let i = 0; i < values.length; i++) {
        // 秒をミリ秒に変換し、BPMを乗する
        // 240BPM全音符 = 60BPM4分音符 = 1000ms
        const waitTime = sequence[i] ? sequence[i] * 1000 / (bpm / 240) : 0;

        const value = values[i];

        // sequence[i]以前の全てを足した分だけ待機する
        setTimeout(() => {
            // 関数呼び出し
            callback(value);
        }, totalTime);

        totalTime += waitTime;
    }

    // ロックを解放
    if (seqId != undefined) {
        setTimeout(() => {
            seqIdAllowFlg.delete(seqId);
        }, totalTime);
    }
}
