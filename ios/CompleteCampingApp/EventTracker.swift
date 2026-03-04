/**
 * EventTracker.swift
 * Minimal event tracking for trial upsell modals
 *
 * Logs to Firebase Analytics if available (requires FirebaseAnalytics pod);
 * otherwise prints to console.
 *
 * Events tracked:
 * - trip2_gate_viewed
 * - upsell_modal_viewed (type: completion|packing|invite)
 * - upsell_cta_clicked (type: completion|packing|invite|trip2_gate)
 * - purchase_completed (plan: string)
 */

import Foundation

// MARK: - EventTracker

public final class EventTracker {
    
    public static let shared = EventTracker()
    
    private init() {}
    
    /// Track an event with optional properties
    /// - Parameters:
    ///   - name: Event name (e.g., "trip2_gate_viewed")
    ///   - props: Optional dictionary of properties
    public func track(name: String, props: [String: Any]? = nil) {
        // Attempt to log to Firebase Analytics if available
        if logToFirebaseAnalytics(name: name, props: props) {
            return
        }
        
        // Fallback: log to console
        logToConsole(name: name, props: props)
    }
    
    // MARK: - Convenience Methods
    
    /// Track Trip #2 gate viewed
    public func trackTrip2GateViewed() {
        track(name: "trip2_gate_viewed")
    }
    
    /// Track upsell modal viewed
    /// - Parameter type: Modal type (completion, packing, invite)
    public func trackUpsellModalViewed(type: String) {
        track(name: "upsell_modal_viewed", props: ["type": type])
    }
    
    /// Track upsell CTA clicked
    /// - Parameter type: Modal type (completion, packing, invite, trip2_gate)
    public func trackUpsellCtaClicked(type: String) {
        track(name: "upsell_cta_clicked", props: ["type": type])
    }
    
    /// Track purchase completed
    /// - Parameter plan: Plan identifier (e.g., "annual", "monthly")
    public func trackPurchaseCompleted(plan: String) {
        track(name: "purchase_completed", props: ["plan": plan])
    }
    
    // MARK: - Private Helpers
    
    private func logToFirebaseAnalytics(name: String, props: [String: Any]?) -> Bool {
        // Check if FirebaseAnalytics is available at runtime
        // This uses dynamic class lookup to avoid compile-time dependency
        guard let analyticsClass = NSClassFromString("FIRAnalytics") as? NSObject.Type else {
            return false
        }
        
        // Use selector to call logEvent:parameters:
        let selector = NSSelectorFromString("logEventWithName:parameters:")
        guard analyticsClass.responds(to: selector) else {
            return false
        }
        
        // Convert props to NSObject compatible types
        let parameters: [String: NSObject]? = props?.compactMapValues { value in
            if let str = value as? String {
                return str as NSString
            } else if let num = value as? NSNumber {
                return num
            } else if let int = value as? Int {
                return NSNumber(value: int)
            } else if let double = value as? Double {
                return NSNumber(value: double)
            } else if let bool = value as? Bool {
                return NSNumber(value: bool)
            }
            return nil
        }
        
        // Call Firebase Analytics
        let _ = analyticsClass.perform(selector, with: name, with: parameters)
        print("[EventTracker] Firebase Analytics: \(name) \(props ?? [:])")
        return true
    }
    
    private func logToConsole(name: String, props: [String: Any]?) {
        let propsString = props.map { dict in
            dict.map { "\($0.key)=\($0.value)" }.joined(separator: ", ")
        } ?? ""
        
        let timestamp = ISO8601DateFormatter().string(from: Date())
        print("[EventTracker] [\(timestamp)] \(name) {\(propsString)}")
    }
}
