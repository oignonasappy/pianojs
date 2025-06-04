# バージョン履歴

#### v1.1.2
- .piano-playに`cursor: pointer;`を設定。

#### v1.1.1
- メソッド`midiToNoteName()`は小数の`midi`を受け取った時に最も近い音名を返すように。
- メソッド`playKeys()`が小数の`midi`を受け取った際、四捨五入ではなく切り捨てていた問題を修正。

### v1.1.0
- メソッド`sequencer()`の引数に`seqId`を追加。  
同一Idの処理は終了するまでロックする。  
未設定の場合は処理をロックしない。

#### v1.0.2
- 行46の誤字を修正。
- ピアノ生成対象の探索を部分一致から`.piano`, `.piano-hover`, `.piano-play`の三対象に限定。
- 複数のクラスが設定されている場合の不具合を修正。

#### v1.0.1
- ファイル全体に対し`"use strict";`を追加。

## v1.0.0
- 初期バージョンであり、  
ピアノの種類は`.piano`, `.piano-hover`, `piano-play`をサポート。  
データ属性は`data-first`, `data-last`, `data-key-width`, `data-key-height`, `data-highlight`, `data-highlight-color`, `data-notename`, `data-key-signature`, `data-custom-notename`, `data-volume`, `data-duration`, `data-osc-type`, `data-tuning`をサポート。  
メソッドは`playNote()`, `playNoteAll()`, `playKeys()`, `playHighlighted()`, `sequencer()`をサポート。
