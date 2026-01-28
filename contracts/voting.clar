;; Multiple Choice Voting Contract
;; Requires POAP ownership to vote

;; Data vars
(define-data-var proposal-count uint u0)
(define-data-var contract-owner principal tx-sender)

;; POAP contract reference (update with actual deployed contract)
(define-constant poap-contract .poap)

;; Data maps
(define-map proposals uint {
  title: (string-utf8 200),
  description: (string-utf8 1000),
  creator: principal,
  start-block: uint,
  end-block: uint,
  options-count: uint,
  total-votes: uint,
  executed: bool
})

(define-map proposal-options {proposal-id: uint, option-id: uint} {
  option-text: (string-utf8 200),
  vote-count: uint
})

(define-map user-votes {proposal-id: uint, voter: principal} uint)

;; Constants
(define-constant err-owner-only (err u200))
(define-constant err-not-found (err u201))
(define-constant err-already-voted (err u202))
(define-constant err-voting-closed (err u203))
(define-constant err-voting-not-started (err u204))
(define-constant err-invalid-option (err u205))
(define-constant err-no-poap (err u206))

;; Authorization
(define-private (is-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Read only functions
(define-read-only (get-proposal (proposal-id uint))
  (ok (map-get? proposals proposal-id))
)

(define-read-only (get-proposal-option (proposal-id uint) (option-id uint))
  (ok (map-get? proposal-options {proposal-id: proposal-id, option-id: option-id}))
)

(define-read-only (get-user-vote (proposal-id uint) (voter principal))
  (ok (map-get? user-votes {proposal-id: proposal-id, voter: voter}))
)

(define-read-only (has-voted (proposal-id uint) (voter principal))
  (ok (is-some (map-get? user-votes {proposal-id: proposal-id, voter: voter})))
)

(define-read-only (get-winning-option (proposal-id uint))
  (let
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-not-found))
      (options-count (get options-count proposal-data))
    )
    (ok (find-winner proposal-id options-count u1 u0 u0))
  )
)

(define-private (find-winner (proposal-id uint) (total-options uint) (current-option uint) (current-winner uint) (max-votes uint))
  (if (<= current-option total-options)
    (let
      (
        (option-data (unwrap-panic (map-get? proposal-options {proposal-id: proposal-id, option-id: current-option})))
        (votes (get vote-count option-data))
      )
      (if (> votes max-votes)
        (find-winner proposal-id total-options (+ current-option u1) current-option votes)
        (find-winner proposal-id total-options (+ current-option u1) current-winner max-votes)
      )
    )
    current-winner
  )
)

;; Public functions
(define-public (create-proposal
  (title (string-utf8 200))
  (description (string-utf8 1000))
  (duration-blocks uint)
  (options (list 10 (string-utf8 200)))
)
  (let
    (
      (proposal-id (+ (var-get proposal-count) u1))
      (start-block block-height)
      (end-block (+ block-height duration-blocks))
      (options-count (len options))
    )
    ;; Check POAP ownership
    (asserts! (unwrap! (contract-call? poap-contract has-poap tx-sender) err-no-poap) err-no-poap)
    
    ;; Create proposal
    (map-set proposals proposal-id {
      title: title,
      description: description,
      creator: tx-sender,
      start-block: start-block,
      end-block: end-block,
      options-count: options-count,
      total-votes: u0,
      executed: false
    })
    
    ;; Set up options
    (map add-option-helper options (list proposal-id u1))
    
    (var-set proposal-count proposal-id)
    (ok proposal-id)
  )
)

(define-private (add-option-helper (option-text (string-utf8 200)) (data (list 2 uint)))
  (let
    (
      (proposal-id (unwrap-panic (element-at data u0)))
      (option-id (unwrap-panic (element-at data u1)))
    )
    (map-set proposal-options {proposal-id: proposal-id, option-id: option-id} {
      option-text: option-text,
      vote-count: u0
    })
    (list proposal-id (+ option-id u1))
  )
)

(define-public (cast-vote (proposal-id uint) (option-id uint))
  (let
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-not-found))
      (option-data (unwrap! (map-get? proposal-options {proposal-id: proposal-id, option-id: option-id}) err-invalid-option))
    )
    ;; Verify POAP ownership
    (asserts! (unwrap! (contract-call? poap-contract has-poap tx-sender) err-no-poap) err-no-poap)
    
    ;; Verify voting period
    (asserts! (>= block-height (get start-block proposal-data)) err-voting-not-started)
    (asserts! (<= block-height (get end-block proposal-data)) err-voting-closed)
    
    ;; Verify hasn't voted
    (asserts! (is-none (map-get? user-votes {proposal-id: proposal-id, voter: tx-sender})) err-already-voted)
    
    ;; Record vote
    (map-set user-votes {proposal-id: proposal-id, voter: tx-sender} option-id)
    
    ;; Update option vote count
    (map-set proposal-options {proposal-id: proposal-id, option-id: option-id} {
      option-text: (get option-text option-data),
      vote-count: (+ (get vote-count option-data) u1)
    })
    
    ;; Update total votes
    (map-set proposals proposal-id (merge proposal-data {
      total-votes: (+ (get total-votes proposal-data) u1)
    }))
    
    (ok true)
  )
)
