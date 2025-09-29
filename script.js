// メイン JavaScript ファイル
class YumetanQuiz {
    constructor() {
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedRanges = [];
        this.quizType = 'en-to-ja';
        this.maxQuestions = 10;
        
        this.initEventListeners();
        this.initRangeControls();
    }

    initEventListeners() {
        // スタート画面のボタン
        document.getElementById('start-quiz').addEventListener('click', () => this.startQuiz());
        
        // 英→日クイズのイベント
        document.getElementById('next-question').addEventListener('click', () => this.nextQuestion());
        document.getElementById('back-to-menu').addEventListener('click', () => this.backToMenu());
        
        // 日→英クイズのイベント
        document.getElementById('check-spelling').addEventListener('click', () => this.checkSpelling());
        document.getElementById('next-spelling-question').addEventListener('click', () => this.nextSpellingQuestion());
        document.getElementById('back-to-menu-spelling').addEventListener('click', () => this.backToMenu());
        document.getElementById('spelling-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkSpelling();
            }
        });
        
        // 結果画面のボタン
        document.getElementById('restart-quiz').addEventListener('click', () => this.restartQuiz());
        document.getElementById('back-to-menu-results').addEventListener('click', () => this.backToMenu());
    }

    initRangeControls() {
        // 範囲追加ボタン
        document.getElementById('add-range').addEventListener('click', () => this.addRangeItem());
        
        // プリセットボタン
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyPreset(btn.dataset.ranges));
        });
        
        // 初期範囲アイテムのイベント設定
        this.updateRangeEvents();
    }

    addRangeItem() {
        const rangeList = document.getElementById('range-list');
        const rangeCount = rangeList.children.length + 1;
        
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        rangeItem.innerHTML = `
            <label>範囲 ${rangeCount}:</label>
            <input type="number" class="range-start" min="1" max="200" value="1" placeholder="開始">
            <span>〜</span>
            <input type="number" class="range-end" min="1" max="200" value="50" placeholder="終了">
            <button type="button" class="remove-range" title="この範囲を削除">×</button>
        `;
        
        rangeList.appendChild(rangeItem);
        this.updateRangeEvents();
    }

    updateRangeEvents() {
        // 削除ボタンのイベント
        document.querySelectorAll('.remove-range').forEach(btn => {
            btn.onclick = (e) => {
                if (document.querySelectorAll('.range-item').length > 1) {
                    e.target.parentElement.remove();
                    this.updateRangeLabels();
                } else {
                    alert('少なくとも1つの範囲は必要です。');
                }
            };
        });
        
        // 範囲入力のバリデーション
        document.querySelectorAll('.range-start, .range-end').forEach(input => {
            input.addEventListener('change', (e) => this.validateRange(e.target));
        });
    }

    updateRangeLabels() {
        document.querySelectorAll('.range-item').forEach((item, index) => {
            item.querySelector('label').textContent = `範囲 ${index + 1}:`;
        });
    }

    validateRange(input) {
        const value = parseInt(input.value);
        const max = getTotalWordCount();
        
        if (value < 1) input.value = 1;
        if (value > max) input.value = max;
        
        // 開始と終了の順序をチェック
        const rangeItem = input.closest('.range-item');
        const startInput = rangeItem.querySelector('.range-start');
        const endInput = rangeItem.querySelector('.range-end');
        
        if (parseInt(startInput.value) > parseInt(endInput.value)) {
            if (input === startInput) {
                endInput.value = startInput.value;
            } else {
                startInput.value = endInput.value;
            }
        }
    }

    applyPreset(rangeString) {
        const rangeList = document.getElementById('range-list');
        rangeList.innerHTML = ''; // 既存の範囲をクリア
        
        const ranges = rangeString.split(',');
        ranges.forEach((range, index) => {
            const [start, end] = range.split('-').map(num => parseInt(num.trim()));
            
            const rangeItem = document.createElement('div');
            rangeItem.className = 'range-item';
            rangeItem.innerHTML = `
                <label>範囲 ${index + 1}:</label>
                <input type="number" class="range-start" min="1" max="200" value="${start}" placeholder="開始">
                <span>〜</span>
                <input type="number" class="range-end" min="1" max="200" value="${end}" placeholder="終了">
                <button type="button" class="remove-range" title="この範囲を削除">×</button>
            `;
            
            rangeList.appendChild(rangeItem);
        });
        
        this.updateRangeEvents();
    }

    startQuiz() {
        // 選択された範囲を取得
        this.selectedRanges = [];
        document.querySelectorAll('.range-item').forEach(item => {
            const start = parseInt(item.querySelector('.range-start').value);
            const end = parseInt(item.querySelector('.range-end').value);
            
            if (start && end && start <= end) {
                this.selectedRanges.push({ start, end });
            }
        });

        if (this.selectedRanges.length === 0) {
            alert('有効な範囲を少なくとも1つ指定してください。');
            return;
        }

        // クイズタイプを取得
        this.quizType = document.querySelector('input[name="quiz-type"]:checked').value;

        // 問題を準備
        this.prepareQuestions();
        
        // 初期化
        this.currentQuestionIndex = 0;
        this.score = 0;

        // 適切なクイズ画面を表示
        if (this.quizType === 'en-to-ja') {
            this.showScreen('en-to-ja-quiz');
            this.displayEnToJaQuestion();
        } else {
            this.showScreen('ja-to-en-quiz');
            this.displayJaToEnQuestion();
        }
    }

    prepareQuestions() {
        // 選択された範囲から全単語を取得
        let allWords = [];
        this.selectedRanges.forEach(range => {
            const rangeWords = getWordsByRange(range.start, range.end);
            allWords = allWords.concat(rangeWords);
        });

        // 重複を削除
        const uniqueWords = allWords.filter((word, index, self) => 
            index === self.findIndex(w => w.id === word.id)
        );

        // ランダムに問題を選択
        this.currentQuestions = this.shuffleArray(uniqueWords).slice(0, this.maxQuestions);
    }

    displayEnToJaQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        
        // 問題番号とスコアを更新
        document.getElementById('question-counter').textContent = 
            `問題 ${this.currentQuestionIndex + 1} / ${this.currentQuestions.length}`;
        document.getElementById('score').textContent = `正解数: ${this.score}`;
        
        // 英単語を表示
        document.getElementById('english-word').textContent = question.english;
        
        // 選択肢を生成
        const choices = this.generateChoices(question);
        const choicesContainer = document.getElementById('choices');
        choicesContainer.innerHTML = '';
        
        choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.className = 'choice';
            choiceElement.textContent = choice;
            choiceElement.addEventListener('click', () => this.selectChoice(choiceElement, choice, question.japanese));
            choicesContainer.appendChild(choiceElement);
        });
        
        // ボタンを非表示に
        document.getElementById('next-question').classList.add('hidden');
        document.getElementById('back-to-menu').classList.add('hidden');
    }

    generateChoices(correctQuestion) {
        const choices = [correctQuestion.japanese];
        
        // 他の単語から間違った選択肢を生成
        const wrongChoices = vocabularyData
            .filter(word => word.japanese !== correctQuestion.japanese)
            .map(word => word.japanese);
        
        // ランダムに3つの間違った選択肢を選択
        const shuffledWrong = this.shuffleArray(wrongChoices);
        for (let i = 0; i < 3 && i < shuffledWrong.length; i++) {
            choices.push(shuffledWrong[i]);
        }
        
        return this.shuffleArray(choices);
    }

    selectChoice(choiceElement, selectedChoice, correctAnswer) {
        // 他の選択肢を無効化
        const allChoices = document.querySelectorAll('.choice');
        allChoices.forEach(choice => {
            choice.style.pointerEvents = 'none';
        });
        
        // 正解判定
        const isCorrect = selectedChoice === correctAnswer;
        
        if (isCorrect) {
            choiceElement.classList.add('correct');
            this.score++;
        } else {
            choiceElement.classList.add('incorrect');
            // 正解を表示
            allChoices.forEach(choice => {
                if (choice.textContent === correctAnswer) {
                    choice.classList.add('correct');
                }
            });
        }
        
        // スコアを更新
        document.getElementById('score').textContent = `正解数: ${this.score}`;
        
        // 次の問題ボタンまたは結果ボタンを表示
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            document.getElementById('next-question').classList.remove('hidden');
        } else {
            document.getElementById('back-to-menu').classList.remove('hidden');
            document.getElementById('back-to-menu').textContent = '結果を見る';
            document.getElementById('back-to-menu').onclick = () => this.showResults();
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuestions.length) {
            this.displayEnToJaQuestion();
        } else {
            this.showResults();
        }
    }

    displayJaToEnQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        
        // 問題番号とスコアを更新
        document.getElementById('spelling-question-counter').textContent = 
            `問題 ${this.currentQuestionIndex + 1} / ${this.currentQuestions.length}`;
        document.getElementById('spelling-score').textContent = `正解数: ${this.score}`;
        
        // 日本語を表示
        document.getElementById('japanese-word').textContent = question.japanese;
        
        // 入力フィールドをリセット
        const input = document.getElementById('spelling-input');
        input.value = '';
        input.disabled = false;
        input.focus();
        
        // フィードバックを非表示に
        document.getElementById('spelling-feedback').classList.add('hidden');
        
        // ボタンをリセット
        document.getElementById('check-spelling').classList.remove('hidden');
        document.getElementById('next-spelling-question').classList.add('hidden');
        document.getElementById('back-to-menu-spelling').classList.add('hidden');
    }

    checkSpelling() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        const userInput = document.getElementById('spelling-input').value.trim().toLowerCase();
        const correctAnswer = question.english.toLowerCase();
        
        const isCorrect = userInput === correctAnswer;
        const feedback = document.getElementById('spelling-feedback');
        
        if (isCorrect) {
            feedback.textContent = `正解！ "${question.english}"`;
            feedback.className = 'feedback correct';
            this.score++;
        } else {
            feedback.textContent = `不正解。正解は "${question.english}" でした。`;
            feedback.className = 'feedback incorrect';
        }
        
        feedback.classList.remove('hidden');
        
        // スコアを更新
        document.getElementById('spelling-score').textContent = `正解数: ${this.score}`;
        
        // 入力を無効化
        document.getElementById('spelling-input').disabled = true;
        document.getElementById('check-spelling').classList.add('hidden');
        
        // 次の問題ボタンまたは結果ボタンを表示
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            document.getElementById('next-spelling-question').classList.remove('hidden');
        } else {
            document.getElementById('back-to-menu-spelling').classList.remove('hidden');
            document.getElementById('back-to-menu-spelling').textContent = '結果を見る';
            document.getElementById('back-to-menu-spelling').onclick = () => this.showResults();
        }
    }

    nextSpellingQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuestions.length) {
            this.displayJaToEnQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.showScreen('results');
        
        const percentage = Math.round((this.score / this.currentQuestions.length) * 100);
        
        document.getElementById('final-score').innerHTML = `
            <h3>${this.score} / ${this.currentQuestions.length} 問正解</h3>
            <p>正解率: ${percentage}%</p>
        `;
        
        let message = '';
        if (percentage >= 90) {
            message = '素晴らしい！完璧に近い成績です！🎉';
        } else if (percentage >= 80) {
            message = 'とても良い成績です！👏';
        } else if (percentage >= 70) {
            message = '良い成績です。もう少し頑張りましょう！💪';
        } else if (percentage >= 60) {
            message = '合格点です。復習して更に向上を目指しましょう！📚';
        } else {
            message = '復習が必要です。諦めずに頑張りましょう！🔥';
        }
        
        document.getElementById('performance-message').textContent = message;
    }

    restartQuiz() {
        this.backToMenu();
    }

    backToMenu() {
        this.showScreen('unit-selection');
        
        // ボタンのイベントハンドラーをリセット
        document.getElementById('back-to-menu').onclick = () => this.backToMenu();
        document.getElementById('back-to-menu-spelling').onclick = () => this.backToMenu();
    }

    showScreen(screenId) {
        // 全ての画面を非表示
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // 指定された画面を表示
        document.getElementById(screenId).classList.remove('hidden');
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    new YumetanQuiz();
});