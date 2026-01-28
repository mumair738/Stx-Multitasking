;; POAP NFT Contract
;; Simple Proof of Attendance Protocol implementation

;; Define the NFT
(define-non-fungible-token poap uint)

;; Data vars
(define-data-var last-token-id uint u0)
(define-data-var contract-owner principal tx-sender)

;; Data maps
(define-map token-metadata uint {
  event-name: (string-ascii 50),
  event-date: uint,
  image-uri: (string-ascii 256)
})

(define-map event-admins principal bool)

;; Constants
(define-constant err-owner-only (err u100))
(define-constant err-not-admin (err u101))
(define-constant err-already-claimed (err u102))
(define-constant err-not-found (err u103))

;; Authorization checks
(define-private (is-owner)
  (is-eq tx-sender (var-get contract-owner))
)

(define-private (is-admin)
  (or (is-owner) (default-to false (map-get? event-admins tx-sender)))
)

;; Read only functions
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
  (ok (some (get image-uri (unwrap! (map-get? token-metadata token-id) (err err-not-found)))))
)

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? poap token-id))
)

(define-read-only (get-token-metadata (token-id uint))
  (ok (map-get? token-metadata token-id))
)

(define-read-only (has-poap (user principal))
  (let ((balance (get-balance user)))
    (ok (> balance u0))
  )
)

(define-read-only (get-balance (user principal))
  (let ((token-id-iter (var-get last-token-id)))
    (fold check-ownership (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10) u0)
  )
)

(define-private (check-ownership (token-id uint) (count uint))
  (if (is-some (nft-get-owner? poap token-id))
    (if (is-eq (unwrap-panic (nft-get-owner? poap token-id)) tx-sender)
      (+ count u1)
      count
    )
    count
  )
)

;; Public functions
(define-public (set-admin (admin principal) (status bool))
  (begin
    (asserts! (is-owner) err-owner-only)
    (ok (map-set event-admins admin status))
  )
)

(define-public (mint-poap 
  (recipient principal) 
  (event-name (string-ascii 50)) 
  (event-date uint)
  (image-uri (string-ascii 256))
)
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
    )
    (asserts! (is-admin) err-not-admin)
    (try! (nft-mint? poap token-id recipient))
    (map-set token-metadata token-id {
      event-name: event-name,
      event-date: event-date,
      image-uri: image-uri
    })
    (var-set last-token-id token-id)
    (ok token-id)
  )
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) (err u104))
    (nft-transfer? poap token-id sender recipient)
  )
)
