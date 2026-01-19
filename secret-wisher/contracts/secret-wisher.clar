;; title: secret-wisher
;; version: 1.0.0
;; summary: a simple wish system to post and manage wishes
;; description: a contract that allows anyone to make wishes and update them, with getter functions to view wishes and their wishers

;; traits
;;

;; token definitions
;;

;; constants
(define-constant ERR-WISH-NOT-FOUND (err u404))
(define-constant ERR-EMPTY-WISH (err u400))
;;

;; data vars
(define-data-var wish-counter uint u0)
;;

;; data maps
(define-map wishes
    uint
    {
        wish: (string-utf8 500),
        wisher: principal,
        created-at: uint,
        updated-at: uint,
    }
)

(define-map user-wishes
    principal
    (list
        100
        uint
    )
)
;;

;; public functions

;; Function to make a new wish
(define-public (make-wish (wish-text (string-utf8 500)))
    (let (
            (wish-id (+ (var-get wish-counter) u1))
            (caller tx-sender)
            (current-block stacks-block-height)
        )
        (asserts! (> (len wish-text) u0) ERR-EMPTY-WISH)
        ;; Store the wish
        (map-set wishes wish-id {
            wish: wish-text,
            wisher: caller,
            created-at: current-block,
            updated-at: current-block,
        })
        ;; Update user's wish list
        (let ((current-wishes (default-to (list) (map-get? user-wishes caller))))
            (map-set user-wishes caller
                (unwrap-panic (as-max-len? (append current-wishes wish-id) u100))
            )
        )
        ;; Increment counter
        (var-set wish-counter wish-id)
        (ok wish-id)
    )
)

;; Function to update an existing wish (anyone can update any wish)
(define-public (update-wish
        (wish-id uint)
        (new-wish-text (string-utf8 500))
    )
    (let (
            (existing-wish (unwrap! (map-get? wishes wish-id) ERR-WISH-NOT-FOUND))
            (current-block stacks-block-height)
            (caller tx-sender)
        )
        (asserts! (> (len new-wish-text) u0) ERR-EMPTY-WISH)
        ;; Update the wish with new text and timestamp
        (map-set wishes wish-id {
            wish: new-wish-text,
            wisher: caller,
            created-at: (get created-at existing-wish),
            updated-at: current-block,
        })
        (ok true)
    )
)
;;

;; read only functions

;; Get a specific wish by ID
(define-read-only (get-wish (wish-id uint))
    (map-get? wishes wish-id)
)

;; Get the wisher of a specific wish
(define-read-only (get-wish-wisher (wish-id uint))
    (match (map-get? wishes wish-id)
        wisher (some (get wisher wisher))
        none
    )
)

;; Get wish text only
(define-read-only (get-wish-text (wish-id uint))
    (match (map-get? wishes wish-id)
        wish (some (get wish wish))
        none
    )
)

;; Get all wish IDs created by a specific user
(define-read-only (get-user-wishes (user principal))
    (default-to (list) (map-get? user-wishes user))
)

;; Get the total number of wishes
(define-read-only (get-total-wishes)
    (var-get wish-counter)
)

;; Check if a wish exists
(define-read-only (wish-exists (wish-id uint))
    (is-some (map-get? wishes wish-id))
)

;; Get wish creation and update timestamps
(define-read-only (get-wish-timestamps (wish-id uint))
    (match (map-get? wishes wish-id)
        wish-data (some {
            created-at: (get created-at wish-data),
            updated-at: (get updated-at wish-data),
        })
        none
    )
)
;;

;; private functions
;;
