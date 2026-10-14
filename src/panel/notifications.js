    // =========================================================================================
    // 11g. NOTIFICATIONS: THE GAME'S UNATTENDED VIEWING, FROM THE SETTINGS (6.62)
    // =========================================================================================
    // Game build v0.10.6b added "Unattended Viewing Mode" (unattendedViewing.js): while it is on,
    // the diamond reward pop-up no longer covers the board. A short line bottom left says what
    // came in and goes after 10 to 60 seconds; the rewards are credited anyway, and the summary
    // since the last OK waits behind "Review rewards". The game put the switch into the panel
    // behind its sound button — with the gear on, that panel is hidden, so neither the switch nor
    // Review rewards could be reached. It is a notification setting, so it gets a page of its own.
    //
    // Like the graphics picker (11d) this keeps no second copy. The game keeps the choice itself
    // (localStorage mcf.unattendedViewing.v1) and listens on the document: a click on anything
    // matching [data-role="unattended-toggle"] or [data-role="unattended-review-rewards"], a change
    // event on [data-role="unattended-seconds"]. Working its hidden controls is exactly the path
    // its own panel takes. The controls stay hidden for guests and signed-out viewers, and the
    // game ignores them there — this page says so instead of offering a dead switch.
    const unattendedEl = r => soundEl('unattended-' + r);

    function unattendedState() {
        const toggle = unattendedEl('toggle');
        if (!toggle) return null;
        const box = toggle.closest('[data-role="unattended-controls"]');
        const review = unattendedEl('review-rewards');
        return {
            signedIn: !!box && !box.hidden,
            on: toggle.getAttribute('aria-pressed') === 'true',
            seconds: Number((unattendedEl('seconds') || {}).value) || 20,
            pending: !!review && !review.disabled,
        };
    }

    function unattendedSeconds(value) {
        const input = unattendedEl('seconds');
        if (!input || Number(input.value) === Number(value)) return;
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function unattendedReset() {
        const u = unattendedState();
        if (!u || !u.signedIn) return;
        if (u.on) unattendedEl('toggle').click();
        unattendedSeconds(20);
    }

    // The game redraws its controls when the choice changes or a reward summary starts or stops
    // waiting. One observer per open page follows that, so "Review rewards" lights up while the
    // page is open; it lets go as soon as the page is gone.
    let unattendedWatch = null;
    function watchUnattended(card, redraw) {
        if (unattendedWatch) unattendedWatch.disconnect();
        const box = unattendedEl('toggle') && unattendedEl('toggle').closest('[data-role="unattended-controls"]');
        if (!box) return;
        let queued = false;
        unattendedWatch = new MutationObserver(() => {
            if (!card.isConnected) { unattendedWatch.disconnect(); unattendedWatch = null; return; }
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; if (card.isConnected) redraw(); });
        });
        unattendedWatch.observe(box, { attributes: true, childList: true, subtree: true, characterData: true });
    }

    // A button only while there is something to review. A disabled .mcfo-set__reset is hidden on
    // purpose (the reset buttons of the sliders vanish at their default), so the other states are
    // a line of text instead.
    function unattendedReviewControl(why) {
        if (why) {
            const t = document.createElement('span');
            t.className = 'mcfo-set__hint';
            t.textContent = why;
            return t;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mcfo-set__reset';
        btn.textContent = 'Review rewards (pending)';
        btn.addEventListener('click', () => { const b = unattendedEl('review-rewards'); if (b && !b.disabled) b.click(); });
        return btn;
    }

    function notificationsCard(redraw) {
        const card = document.createElement('div');
        card.className = 'mcfo-set__card';
        const u = unattendedState();
        if (!u || !u.signedIn) {
            const note = document.createElement('div');
            note.className = 'mcfo-set__notice';
            note.textContent = !u
                ? 'The game has not drawn this control yet. Open this page again in a moment.'
                : 'Unattended viewing is only there while you are signed in with Twitch (the game\'s rule).';
            card.appendChild(note);
            return card;
        }
        const wrap = document.createElement('div');
        wrap.className = 'mcfo-set__item';
        const row = document.createElement('label');
        row.className = 'mcfo-set__row';
        row.innerHTML = '<span class="mcfo-set__text"><span class="mcfo-set__label"></span>'
                      + '<span class="mcfo-set__hint"></span></span>'
                      + '<input type="checkbox" class="mcfo-switch__input">'
                      + '<span class="mcfo-switch" aria-hidden="true"></span>';
        row.querySelector('.mcfo-set__label').textContent = 'Unattended viewing';
        row.querySelector('.mcfo-set__hint').textContent = 'For long viewing sessions or a stream. The diamond reward pop-up '
            + 'no longer covers the board: a short line bottom left says what came in and goes after the time below. '
            + 'The rewards are credited anyway; the summary since your last OK waits under Review rewards. '
            + 'The game keeps this choice itself, in this browser.';
        const input = row.querySelector('input');
        input.checked = u.on;
        input.addEventListener('change', () => {
            const now = unattendedState();
            if (now && now.on !== input.checked) unattendedEl('toggle').click();
            redraw();
        });
        wrap.appendChild(row);

        const time = document.createElement('div');
        time.className = 'mcfo-set__sub';
        time.innerHTML = '<span class="mcfo-set__sublabel">Notice duration</span>'
                       + '<input type="range" class="mcfo-set__range" min="10" max="60" step="1">'
                       + '<span class="mcfo-set__val"></span>';
        const range = time.querySelector('input');
        const val = time.querySelector('.mcfo-set__val');
        range.value = u.seconds;
        val.textContent = u.seconds + ' s';
        range.addEventListener('input', () => { val.textContent = range.value + ' s'; });
        // Handed over when let go: every change rewrites the game's localStorage entry.
        range.addEventListener('change', () => unattendedSeconds(Number(range.value)));
        time.toggleAttribute('data-off', !u.on);

        const review = document.createElement('div');
        review.className = 'mcfo-set__sub';
        review.innerHTML = '<span class="mcfo-set__sublabel">Rewards</span>';
        review.appendChild(unattendedReviewControl(u.pending ? '' : 'Nothing to review'));

        wrap.append(time, review);
        card.appendChild(wrap);
        watchUnattended(card, redraw);
        return card;
    }
